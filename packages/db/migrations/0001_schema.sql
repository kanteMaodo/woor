-- =====================================================================
-- Wóor : schéma PostgreSQL 16 du pilote (Dakar Bitcoin Hack 2026)
--
-- À exécuter sur une base VIDE, par un superutilisateur :
--   createdb woor
--   psql -d woor -v ON_ERROR_STOP=1 -f woor_schema.sql
--
-- Conventions
--   * Identifiants en anglais, commentaires en français.
--   * Montants en FCFA : integer. Montants bitcoin : millisatoshis (bigint).
--   * Aucune donnée personnelle en clair : téléphones, quartier et repère
--     sont chiffrés par l'API (AES-256-GCM) ; la base garde le texte chiffré,
--     l'identifiant de clé et, pour la recherche, un HMAC.
--   * Secrets de déblocage Lightning : schéma woor_secret, lisible par le
--     seul service de paiements.
--   * Une commande ne change d'état que par woor.apply_order_event(), qui
--     applique la table woor.order_transitions.
--   * L'API n'écrit presque rien en direct : elle appelle des fonctions
--     SECURITY DEFINER qui vérifient le rôle, la personne et l'état.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Rôles PostgreSQL (groupes sans connexion ; les comptes de connexion
--    sont créés après installation, voir la fin du script)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['woor_owner', 'woor_api', 'woor_worker',
                           'woor_readonly', 'woor_auditor', 'woor_backup']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS', r);
    END IF;
  END LOOP;
END
$$;

COMMENT ON ROLE woor_owner    IS 'Propriétaire des objets. Sert uniquement aux migrations.';
COMMENT ON ROLE woor_api      IS 'API web : vendeuses, livreurs, acheteurs, arbitres, administrateurs. Soumise à la RLS.';
COMMENT ON ROLE woor_worker   IS 'Service de paiements : factures, règlements, versements, minuteurs. Seul à lire les secrets.';
COMMENT ON ROLE woor_readonly IS 'Mesures du pilote : vues agrégées, sans donnée personnelle.';
COMMENT ON ROLE woor_auditor  IS 'Lecture et vérification du journal d''audit chaîné.';
COMMENT ON ROLE woor_backup   IS 'Sauvegardes pg_dump. Le compte de connexion doit avoir BYPASSRLS (attribut non hérité).';

GRANT pg_read_all_data TO woor_backup;

-- ---------------------------------------------------------------------
-- 2. Schémas
-- ---------------------------------------------------------------------
CREATE SCHEMA woor        AUTHORIZATION woor_owner;
CREATE SCHEMA woor_secret AUTHORIZATION woor_owner;
CREATE SCHEMA audit       AUTHORIZATION woor_owner;

COMMENT ON SCHEMA woor        IS 'Données métier de Wóor.';
COMMENT ON SCHEMA woor_secret IS 'Secrets de déblocage chiffrés. Accès : woor_worker uniquement.';
COMMENT ON SCHEMA audit       IS 'Journal d''audit en ajout seul, chaîné par SHA-256.';

-- Tout ce qui suit appartient à woor_owner.
SET ROLE woor_owner;

-- ---------------------------------------------------------------------
-- 3. Types énumérés
-- ---------------------------------------------------------------------
CREATE TYPE woor.app_role             AS ENUM ('seller', 'courier', 'arbiter', 'admin', 'buyer', 'system');
CREATE TYPE woor.user_status          AS ENUM ('invited', 'active', 'suspended', 'closed');
CREATE TYPE woor.credential_kind      AS ENUM ('passkey', 'pin');
CREATE TYPE woor.order_state          AS ENUM ('awaiting_payment', 'locked', 'in_transit', 'disputed',
                                               'delivered', 'paid_out', 'courier_paid', 'refunded', 'expired');
CREATE TYPE woor.invoice_kind         AS ENUM ('delivery_fee', 'item');
CREATE TYPE woor.invoice_state        AS ENUM ('open', 'accepted', 'settling', 'settled', 'cancelling', 'cancelled');
CREATE TYPE woor.payout_kind          AS ENUM ('seller', 'courier', 'buyer_refund', 'courier_compensation');
CREATE TYPE woor.payout_state         AS ENUM ('scheduled', 'pending', 'in_flight', 'succeeded', 'failed',
                                               'held', 'cancelled', 'needs_attention');
CREATE TYPE woor.dispute_reason       AS ENUM ('code_refused', 'code_locked', 'not_conforming', 'refusal_contested',
                                               'no_show_contested', 'lost_code', 'not_received', 'not_me', 'other');
CREATE TYPE woor.dispute_state        AS ENUM ('open', 'decided', 'defaulted');
CREATE TYPE woor.dispute_decision     AS ENUM ('settle_both', 'settle_fee_cancel_item', 'cancel_both',
                                               'reissue_code', 'release_payouts', 'refund_buyer');
CREATE TYPE woor.location_event       AS ENUM ('arrived', 'no_show');
CREATE TYPE woor.address_change_state AS ENUM ('pending', 'applied', 'cancelled');
CREATE TYPE woor.evidence_kind        AS ENUM ('photo', 'note', 'call_log');
CREATE TYPE woor.permission_scope     AS ENUM ('self', 'own', 'assigned', 'link', 'device', 'all');

-- ---------------------------------------------------------------------
-- 4. Contexte de la requête et utilitaires
--    L'API pose le contexte au début de chaque transaction :
--      SELECT set_config('woor.user_id', '<uuid>', true),
--             set_config('woor.role', 'seller', true),
--             set_config('woor.buyer_order_id', '<uuid>', true);   -- acheteur seulement
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.ctx_user() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('woor.user_id', true), '')::uuid $$;

CREATE FUNCTION woor.ctx_role() RETURNS woor.app_role
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('woor.role', true), '')::woor.app_role $$;

CREATE FUNCTION woor.ctx_buyer_order() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('woor.buyer_order_id', true), '')::uuid $$;

COMMENT ON FUNCTION woor.ctx_user()        IS 'Utilisateur connecté (vendeuse, livreur, arbitre, administrateur).';
COMMENT ON FUNCTION woor.ctx_role()        IS 'Rôle de la requête. buyer = appareil lié, sans compte.';
COMMENT ON FUNCTION woor.ctx_buyer_order() IS 'Commande de l''appareil acheteur, posée après woor.buyer_order().';

-- UUID version 7 : ordonné dans le temps, donc des index plus compacts que la v4.
CREATE FUNCTION woor.uuid_v7() RETURNS uuid
LANGUAGE sql VOLATILE AS $$
  SELECT encode(
           set_bit(
             set_bit(
               overlay(uuid_send(gen_random_uuid())
                       PLACING substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
                       FROM 1 FOR 6),
               52, 1),
             53, 1),
           'hex')::uuid
$$;

CREATE FUNCTION woor.trg_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION woor.secs(p_seconds bigint) RETURNS interval
LANGUAGE sql IMMUTABLE AS $$ SELECT make_interval(secs => p_seconds::double precision) $$;

-- ---------------------------------------------------------------------
-- 5. Référentiels : réglages, interrupteur, permissions, transitions
-- ---------------------------------------------------------------------
CREATE TABLE woor.settings (
  key          text PRIMARY KEY CHECK (key ~ '^[a-z_]+$'),
  value        bigint NOT NULL,
  min_value    bigint NOT NULL,
  max_value    bigint NOT NULL,
  unit         text NOT NULL CHECK (unit IN ('xof', 'sec', 'count', 'blocks', 'ppm', 'days', 'bool')),
  description  text NOT NULL,
  updated_by   uuid,                                       -- FK ajoutée après woor.users
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_bounds CHECK (min_value <= max_value AND value BETWEEN min_value AND max_value)
);
COMMENT ON TABLE woor.settings IS 'Plafonds et minuteurs réglables sans redéploiement, chacun borné par min_value et max_value.';

CREATE TABLE woor.kill_switch (
  id                    boolean PRIMARY KEY DEFAULT true CHECK (id),     -- une seule ligne
  engaged               boolean NOT NULL DEFAULT false,
  engaged_at            timestamptz,
  engaged_by            uuid,                                            -- NULL = déclenché par le système
  engaged_reason        text CHECK (char_length(engaged_reason) <= 300),
  release_requested_by  uuid,
  release_requested_at  timestamptz,
  released_by           uuid,
  released_at           timestamptz,
  CONSTRAINT kill_switch_four_eyes CHECK (released_by IS NULL OR release_requested_by IS NULL
                                          OR released_by <> release_requested_by)
);
COMMENT ON TABLE woor.kill_switch IS 'Interrupteur général : plus de nouvelle commande ni de nouveau blocage. Réactivation par deux arbitres distincts.';

CREATE TABLE woor.permissions (
  code         text PRIMARY KEY CHECK (code ~ '^[a-z_]+\.[a-z_]+$'),
  description  text NOT NULL
);
COMMENT ON TABLE woor.permissions IS 'Catalogue des permissions vérifiées par l''API avant chaque action.';

CREATE TABLE woor.role_permissions (
  role        woor.app_role NOT NULL,
  permission  text NOT NULL REFERENCES woor.permissions (code),
  scope       woor.permission_scope NOT NULL,
  PRIMARY KEY (role, permission)
);
COMMENT ON TABLE woor.role_permissions IS 'Qui a quelle permission et sur quel périmètre : soi, ses commandes, ses courses, le lien, l''appareil lié, tout.';

CREATE TABLE woor.order_transitions (
  from_state     woor.order_state NOT NULL,
  event          text NOT NULL CHECK (event ~ '^[a-z_]+$'),
  to_state       woor.order_state NOT NULL,
  allowed_roles  woor.app_role[] NOT NULL CHECK (cardinality(allowed_roles) > 0),
  PRIMARY KEY (from_state, event)
);
COMMENT ON TABLE woor.order_transitions IS 'Machine à états des commandes : seule référence des passages autorisés.';

-- ---------------------------------------------------------------------
-- 6. Comptes et accès
-- ---------------------------------------------------------------------
CREATE TABLE woor.users (
  id                     uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  role                   woor.app_role NOT NULL CHECK (role IN ('seller', 'courier', 'arbiter', 'admin')),
  display_name           text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 60),
  phone_enc              bytea,
  phone_key_id           smallint,
  phone_hmac             bytea UNIQUE CHECK (phone_hmac IS NULL OR octet_length(phone_hmac) = 32),
  phone_last2            char(2) CHECK (phone_last2 ~ '^[0-9]{2}$'),
  status                 woor.user_status NOT NULL DEFAULT 'invited',
  payout_ln_address      text CHECK (payout_ln_address ~* '^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  payout_address_set_at  timestamptz,
  identity_checked_at    timestamptz,
  identity_checked_by    uuid REFERENCES woor.users (id),
  suspended_reason       text CHECK (char_length(suspended_reason) <= 300),
  last_login_at          timestamptz,
  closed_at              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_phone_present     CHECK (status = 'closed' OR (phone_enc IS NOT NULL AND phone_key_id IS NOT NULL
                                                                  AND phone_hmac IS NOT NULL AND phone_last2 IS NOT NULL)),
  CONSTRAINT users_suspension_reason CHECK (status <> 'suspended' OR suspended_reason IS NOT NULL),
  CONSTRAINT users_payout_roles      CHECK (payout_ln_address IS NULL OR role IN ('seller', 'courier')),
  CONSTRAINT users_identity_check    CHECK ((identity_checked_at IS NULL) = (identity_checked_by IS NULL))
);
COMMENT ON TABLE woor.users IS 'Vendeuses, livreurs, arbitres, administrateurs. Un numéro = un compte = un rôle. L''acheteur n''a pas de compte.';
COMMENT ON COLUMN woor.users.phone_hmac IS 'HMAC-SHA256 du numéro E.164 (clé secrète de l''API) : connexion et unicité. Effacé à la clôture.';
COMMENT ON COLUMN woor.users.phone_last2 IS 'Deux derniers chiffres, montrés à l''acheteur pour reconnaître son livreur.';
COMMENT ON COLUMN woor.users.payout_ln_address IS 'Adresse Lightning de versement. Ne change que par woor.request_payout_address_change() : 24 h de délai.';

ALTER TABLE woor.settings    ADD FOREIGN KEY (updated_by)           REFERENCES woor.users (id);
ALTER TABLE woor.kill_switch ADD FOREIGN KEY (engaged_by)           REFERENCES woor.users (id);
ALTER TABLE woor.kill_switch ADD FOREIGN KEY (release_requested_by) REFERENCES woor.users (id);
ALTER TABLE woor.kill_switch ADD FOREIGN KEY (released_by)          REFERENCES woor.users (id);

CREATE TABLE woor.credentials (
  id               uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  user_id          uuid NOT NULL REFERENCES woor.users (id),
  kind             woor.credential_kind NOT NULL,
  label            text CHECK (char_length(label) <= 40),
  webauthn_id      bytea UNIQUE,
  public_key       bytea,
  sign_count       bigint NOT NULL DEFAULT 0 CHECK (sign_count >= 0),
  transports       text[],
  pin_hash         text,
  failed_attempts  smallint NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  locked_until     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_used_at     timestamptz,
  CONSTRAINT credentials_shape CHECK (
       (kind = 'passkey' AND webauthn_id IS NOT NULL AND public_key IS NOT NULL AND pin_hash IS NULL)
    OR (kind = 'pin' AND pin_hash LIKE '$argon2id$%' AND webauthn_id IS NULL AND public_key IS NULL))
);
COMMENT ON TABLE woor.credentials IS 'Passkeys WebAuthn liées au domaine et PIN de secours (Argon2id + clé secrète de l''API), bloqué 15 min après 5 échecs.';

CREATE TABLE woor.sessions (
  id              uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  user_id         uuid NOT NULL REFERENCES woor.users (id),
  token_hash      bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  device_label    text CHECK (char_length(device_label) <= 60),
  ip_prefix_hash  bytea CHECK (ip_prefix_hash IS NULL OR octet_length(ip_prefix_hash) = 32),
  ua_hash         bytea CHECK (ua_hash IS NULL OR octet_length(ua_hash) = 32),
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  last_seen_at    timestamptz,
  reauth_at       timestamptz,
  revoked_at      timestamptz,
  revoked_reason  text CHECK (revoked_reason IN ('logout', 'suspended', 'admin', 'rotated')),
  CONSTRAINT sessions_max_life CHECK (expires_at > created_at AND expires_at <= created_at + interval '12 hours'),
  CONSTRAINT sessions_revocation CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL))
);
COMMENT ON TABLE woor.sessions IS 'Sessions par cookie HttpOnly ; seul le SHA-256 du jeton est gardé. 12 h pour vendeuse et livreur ; 15 min glissantes pour arbitre et administrateur.';
COMMENT ON COLUMN woor.sessions.reauth_at IS 'Dernière passkey redemandée : exigée depuis moins de 5 min pour les actions sensibles.';

CREATE TABLE woor.invites (
  id          uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  code_hash   bytea NOT NULL UNIQUE CHECK (octet_length(code_hash) = 32),
  role        woor.app_role NOT NULL CHECK (role IN ('seller', 'courier', 'arbiter', 'admin')),
  phone_hmac  bytea CHECK (phone_hmac IS NULL OR octet_length(phone_hmac) = 32),
  created_by  uuid REFERENCES woor.users (id),          -- NULL = invitation d'amorçage du premier administrateur
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_by     uuid REFERENCES woor.users (id),
  used_at     timestamptz,
  revoked_at  timestamptz,
  CONSTRAINT invites_expiry CHECK (expires_at > created_at AND expires_at <= created_at + interval '48 hours'),
  CONSTRAINT invites_usage  CHECK ((used_by IS NULL) = (used_at IS NULL))
);
COMMENT ON TABLE woor.invites IS 'Invitations à usage unique, 48 h au plus, éventuellement réservées à un numéro. Une vendeuse peut inviter ses livreurs.';

CREATE TABLE woor.seller_couriers (
  seller_id   uuid NOT NULL REFERENCES woor.users (id),
  courier_id  uuid NOT NULL REFERENCES woor.users (id),
  created_by  uuid REFERENCES woor.users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, courier_id),
  CONSTRAINT seller_couriers_distinct CHECK (seller_id <> courier_id)
);
COMMENT ON TABLE woor.seller_couriers IS 'Livreurs avec qui une vendeuse travaille : seuls eux peuvent être choisis pour ses commandes.';

CREATE TABLE woor.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  user_id     uuid NOT NULL REFERENCES woor.users (id),
  endpoint    text NOT NULL UNIQUE CHECK (endpoint ~ '^https://'),
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);
COMMENT ON TABLE woor.push_subscriptions IS 'Abonnements Web Push (VAPID) des vendeuses, livreurs et arbitres.';

CREATE TABLE woor.payout_address_changes (
  id                    uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  user_id               uuid NOT NULL REFERENCES woor.users (id),
  old_address           text,
  new_address           text NOT NULL CHECK (new_address ~* '^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  state                 woor.address_change_state NOT NULL DEFAULT 'pending',
  requested_at          timestamptz NOT NULL DEFAULT now(),
  effective_at          timestamptz NOT NULL,
  applied_at            timestamptz,
  cancelled_at          timestamptz,
  requested_session_id  uuid REFERENCES woor.sessions (id) ON DELETE SET NULL,
  CONSTRAINT address_change_delay   CHECK (old_address IS NULL OR effective_at >= requested_at + interval '24 hours'),
  CONSTRAINT address_change_applied CHECK (state <> 'applied' OR applied_at IS NOT NULL)
);
COMMENT ON TABLE woor.payout_address_changes IS 'Adresse de versement : la première est immédiate, les suivantes effectives 24 h après la demande, avec alerte au titulaire.';

-- ---------------------------------------------------------------------
-- 7. Commandes, factures, secrets
-- ---------------------------------------------------------------------
CREATE TABLE woor.fx_quotes (
  id           uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  eur_per_btc  numeric(14, 2) NOT NULL CHECK (eur_per_btc > 0),
  xof_per_btc  numeric(16, 2) GENERATED ALWAYS AS (round(eur_per_btc * 655.957, 2)) STORED,
  sources      jsonb NOT NULL CHECK (jsonb_typeof(sources) = 'array' AND jsonb_array_length(sources) >= 3),
  spread_pct   numeric(5, 2) NOT NULL CHECK (spread_pct BETWEEN 0 AND 2)
);
COMMENT ON TABLE woor.fx_quotes IS 'Cours BTC/EUR médian de 3 sources, converti à la parité fixe 1 EUR = 655,957 F. Refusé si les sources s''écartent de plus de 2 %.';

CREATE TABLE woor.orders (
  id                   uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  public_token_hash    bytea NOT NULL UNIQUE CHECK (octet_length(public_token_hash) = 32),
  seller_id            uuid NOT NULL REFERENCES woor.users (id),
  courier_id           uuid NOT NULL REFERENCES woor.users (id),
  item_label           text NOT NULL CHECK (char_length(item_label) BETWEEN 2 AND 80),
  item_price_xof       integer NOT NULL CHECK (item_price_xof BETWEEN 500 AND 50000),
  delivery_fee_xof     integer NOT NULL CHECK (delivery_fee_xof BETWEEN 500 AND 10000),
  total_xof            integer GENERATED ALWAYS AS (item_price_xof + delivery_fee_xof) STORED,
  address_enc          bytea,
  address_key_id       smallint,
  buyer_phone_enc      bytea,
  buyer_phone_key_id   smallint,
  delivery_window      tstzrange,
  state                woor.order_state NOT NULL DEFAULT 'awaiting_payment',
  state_version        integer NOT NULL DEFAULT 0,
  buyer_device_hash    bytea CHECK (buyer_device_hash IS NULL OR octet_length(buyer_device_hash) = 32),
  claimed_at           timestamptz,
  delivery_code_hmac   bytea CHECK (delivery_code_hmac IS NULL OR octet_length(delivery_code_hmac) = 32),
  code_issued_at       timestamptz,
  code_reissues        smallint NOT NULL DEFAULT 0 CHECK (code_reissues BETWEEN 0 AND 3),
  code_attempts        smallint NOT NULL DEFAULT 0 CHECK (code_attempts BETWEEN 0 AND 5),
  code_locked_at       timestamptz,
  pay_deadline         timestamptz,
  pickup_deadline      timestamptz,
  hard_stop_at         timestamptz,
  locked_at            timestamptz,
  picked_up_at         timestamptz,
  arrived_at           timestamptz,
  delivered_at         timestamptz,
  closed_at            timestamptz,
  refusal_declared_at  timestamptz,
  no_show_declared_at  timestamptz,
  contest_deadline     timestamptz,
  cancelled_by_role    woor.app_role,
  cancel_reason        text CHECK (char_length(cancel_reason) <= 200),
  purge_after          timestamptz,
  pii_purged_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_distinct_parties   CHECK (seller_id <> courier_id),
  CONSTRAINT orders_address_present    CHECK (pii_purged_at IS NOT NULL OR (address_enc IS NOT NULL AND address_key_id IS NOT NULL)),
  CONSTRAINT orders_buyer_phone_key    CHECK ((buyer_phone_enc IS NULL) = (buyer_phone_key_id IS NULL)),
  CONSTRAINT orders_claim_consistent   CHECK ((buyer_device_hash IS NULL) = (claimed_at IS NULL)),
  CONSTRAINT orders_code_consistent    CHECK ((delivery_code_hmac IS NULL) = (code_issued_at IS NULL)),
  CONSTRAINT orders_transit_has_pickup CHECK (state NOT IN ('in_transit', 'delivered', 'paid_out') OR picked_up_at IS NOT NULL),
  CONSTRAINT orders_delivered_has_time CHECK (state NOT IN ('delivered', 'paid_out') OR delivered_at IS NOT NULL),
  CONSTRAINT orders_closed_has_time    CHECK (state NOT IN ('paid_out', 'courier_paid', 'refunded', 'expired') OR closed_at IS NOT NULL),
  CONSTRAINT orders_single_declaration CHECK (refusal_declared_at IS NULL OR no_show_declared_at IS NULL),
  CONSTRAINT orders_contest_window     CHECK ((contest_deadline IS NULL) = (refusal_declared_at IS NULL AND no_show_declared_at IS NULL))
);
COMMENT ON TABLE woor.orders IS 'Une commande = deux hold invoices (A : course, B : article). L''état ne change que par woor.apply_order_event().';
COMMENT ON COLUMN woor.orders.public_token_hash  IS 'SHA-256 du jeton du lien (128 bits, dérivé par HMAC de l''id : l''API peut redonner le lien sans le stocker).';
COMMENT ON COLUMN woor.orders.address_enc        IS 'Quartier et repère, chiffrés ensemble (AES-256-GCM). Effacés 30 jours après la clôture.';
COMMENT ON COLUMN woor.orders.buyer_phone_enc    IS 'Facultatif, saisi par l''acheteur. Lisible par woor.buyer_contact() seulement : livreur pendant la course, arbitre.';
COMMENT ON COLUMN woor.orders.buyer_device_hash  IS 'SHA-256 du cookie HttpOnly de 256 bits du premier téléphone qui a appuyé sur « Je commande ».';
COMMENT ON COLUMN woor.orders.delivery_code_hmac IS 'HMAC-SHA256 du code de remise à 6 chiffres ; le code en clair n''est jamais stocké.';
COMMENT ON COLUMN woor.orders.hard_stop_at       IS 'Arrêt final : 18 h après le blocage ou 36 blocs avant l''expiration réelle des HTLC, le plus tôt des deux.';

CREATE TABLE woor.strikes (
  id          uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  user_id     uuid NOT NULL REFERENCES woor.users (id),
  order_id    uuid REFERENCES woor.orders (id),
  reason      text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 300),
  created_by  uuid NOT NULL REFERENCES woor.users (id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE woor.strikes IS 'Avertissements donnés par un arbitre ou un administrateur.';

CREATE TABLE woor.invoices (
  id                          uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  order_id                    uuid NOT NULL REFERENCES woor.orders (id),
  kind                        woor.invoice_kind NOT NULL,
  payment_hash                bytea NOT NULL UNIQUE CHECK (octet_length(payment_hash) = 32),
  amount_msat                 bigint NOT NULL CHECK (amount_msat > 0),
  amount_xof                  integer NOT NULL CHECK (amount_xof > 0),
  fx_quote_id                 uuid NOT NULL REFERENCES woor.fx_quotes (id),
  bolt11                      text NOT NULL CHECK (bolt11 ~ '^ln(bc|tb|bcrt|tbs)[0-9a-z]+$'),
  payment_request_expires_at  timestamptz NOT NULL,
  cltv_delta                  integer NOT NULL DEFAULT 144 CHECK (cltv_delta BETWEEN 40 AND 288),
  state                       woor.invoice_state NOT NULL DEFAULT 'open',
  accepted_at                 timestamptz,
  accept_height               integer,
  min_htlc_expiry_height      integer,
  settled_at                  timestamptz,
  cancelled_at                timestamptz,
  cancel_reason               text CHECK (char_length(cancel_reason) <= 200),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_one_per_kind  UNIQUE (order_id, kind),
  CONSTRAINT invoices_accepted_time CHECK (state NOT IN ('accepted', 'settling', 'settled') OR accepted_at IS NOT NULL),
  CONSTRAINT invoices_settled_time  CHECK (state <> 'settled' OR settled_at IS NOT NULL),
  CONSTRAINT invoices_cancel_time   CHECK (state <> 'cancelled' OR cancelled_at IS NOT NULL)
);
COMMENT ON TABLE woor.invoices IS 'Hold invoices LND, deux par commande au plus. settling et cancelling = intention écrite avant l''appel au nœud, pour reprendre après une panne.';

CREATE TABLE woor_secret.invoice_preimages (
  invoice_id   uuid PRIMARY KEY REFERENCES woor.invoices (id),
  preimage_ct  bytea NOT NULL,
  nonce        bytea NOT NULL CHECK (octet_length(nonce) = 12),
  key_id       smallint NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE woor_secret.invoice_preimages IS 'Secret de déblocage (32 octets) chiffré en AES-256-GCM ; la clé n''existe que dans le service de paiements.';

-- ---------------------------------------------------------------------
-- 8. Litiges, versements, preuves, positions
-- ---------------------------------------------------------------------
CREATE TABLE woor.disputes (
  id                   uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  order_id             uuid NOT NULL REFERENCES woor.orders (id),
  opened_by_role       woor.app_role NOT NULL CHECK (opened_by_role IN ('buyer', 'seller', 'courier', 'arbiter', 'system')),
  opened_by_user       uuid REFERENCES woor.users (id),
  reason               woor.dispute_reason NOT NULL,
  description          text CHECK (char_length(description) <= 500),
  post_delivery        boolean NOT NULL DEFAULT false,
  refund_destination   text CHECK (char_length(refund_destination) <= 1500
                                   AND refund_destination ~* '^([a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+|ln(bc|tb|bcrt|tbs)[0-9a-z]{20,})$'),
  state                woor.dispute_state NOT NULL DEFAULT 'open',
  decision             woor.dispute_decision,
  decided_by           uuid REFERENCES woor.users (id),
  decided_at           timestamptz,
  justification        text CHECK (char_length(justification) <= 1000),
  courier_compensated  boolean NOT NULL DEFAULT false,
  decide_before        timestamptz NOT NULL,
  defaulted_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disputes_decision_iff_decided CHECK ((state = 'decided') = (decision IS NOT NULL)),
  CONSTRAINT disputes_decision_complete    CHECK (state <> 'decided' OR (decided_by IS NOT NULL AND decided_at IS NOT NULL
                                                                         AND char_length(justification) >= 10)),
  CONSTRAINT disputes_post_delivery_reason CHECK (NOT post_delivery OR reason IN ('not_received', 'not_me')),
  CONSTRAINT disputes_decision_fits        CHECK (decision IS NULL OR post_delivery = (decision IN ('release_payouts', 'refund_buyer'))),
  CONSTRAINT disputes_default_time         CHECK ((state = 'defaulted') = (defaulted_at IS NOT NULL))
);
COMMENT ON TABLE woor.disputes IS 'Litiges et signalements. Décision : arbitre actif, justification d''au moins 10 caractères. post_delivery = « Je n''ai rien reçu » ou « Ce n''était pas moi » pendant le versement différé.';

CREATE TABLE woor.payouts (
  id               uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  order_id         uuid NOT NULL REFERENCES woor.orders (id),
  dispute_id       uuid REFERENCES woor.disputes (id),
  beneficiary_id   uuid REFERENCES woor.users (id),
  kind             woor.payout_kind NOT NULL,
  amount_msat      bigint NOT NULL CHECK (amount_msat > 0),
  amount_xof       integer NOT NULL CHECK (amount_xof > 0),
  max_fee_msat     bigint NOT NULL CHECK (max_fee_msat >= 0),
  destination      text,
  bolt11           text,
  payment_hash     bytea UNIQUE CHECK (payment_hash IS NULL OR octet_length(payment_hash) = 32),
  state            woor.payout_state NOT NULL DEFAULT 'pending',
  release_at       timestamptz NOT NULL DEFAULT now(),
  attempts         smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  next_attempt_at  timestamptz,
  last_error       text CHECK (char_length(last_error) <= 500),
  fee_msat         bigint CHECK (fee_msat IS NULL OR fee_msat >= 0),
  succeeded_at     timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payouts_one_per_kind    UNIQUE (order_id, kind),
  CONSTRAINT payouts_beneficiary     CHECK ((kind = 'buyer_refund') = (beneficiary_id IS NULL)),
  CONSTRAINT payouts_dispute_link    CHECK (kind NOT IN ('buyer_refund', 'courier_compensation') OR dispute_id IS NOT NULL),
  CONSTRAINT payouts_destination     CHECK (state NOT IN ('pending', 'in_flight', 'succeeded', 'failed') OR destination IS NOT NULL),
  CONSTRAINT payouts_in_flight_shape CHECK (state <> 'in_flight' OR (bolt11 IS NOT NULL AND payment_hash IS NOT NULL)),
  CONSTRAINT payouts_succeeded_shape CHECK (state <> 'succeeded' OR (succeeded_at IS NOT NULL AND payment_hash IS NOT NULL)),
  CONSTRAINT payouts_cancelled_time  CHECK ((state = 'cancelled') = (cancelled_at IS NOT NULL)),
  CONSTRAINT payouts_fee_cap         CHECK (fee_msat IS NULL OR fee_msat <= max_fee_msat)
);
COMMENT ON TABLE woor.payouts IS 'Un versement par commande et par type : vendeuse, livreur, remboursement acheteur, dédommagement du livreur par le fonds du pilote.';
COMMENT ON COLUMN woor.payouts.release_at IS 'Versement différé de 2 h pour les 5 premières commandes d''une vendeuse ou d''un nouveau duo vendeuse-livreur.';

CREATE TABLE woor.dispute_evidence (
  id                 uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  dispute_id         uuid NOT NULL REFERENCES woor.disputes (id),
  kind               woor.evidence_kind NOT NULL,
  storage_key        text CHECK (storage_key ~ '^[a-z0-9/_.-]{1,200}$'),
  sha256             bytea CHECK (sha256 IS NULL OR octet_length(sha256) = 32),
  note               text CHECK (char_length(note) <= 1000),
  submitted_by_role  woor.app_role NOT NULL,
  submitted_by_user  uuid REFERENCES woor.users (id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_has_content CHECK (storage_key IS NOT NULL OR note IS NOT NULL),
  CONSTRAINT evidence_photo_hash  CHECK (kind <> 'photo' OR (storage_key IS NOT NULL AND sha256 IS NOT NULL))
);
COMMENT ON TABLE woor.dispute_evidence IS 'Preuves d''un litige. Photos hors base (clé + empreinte), sans métadonnées EXIF, effacées avec les données personnelles.';

CREATE TABLE woor.location_proofs (
  id           uuid PRIMARY KEY DEFAULT woor.uuid_v7(),
  order_id     uuid NOT NULL REFERENCES woor.orders (id),
  courier_id   uuid NOT NULL REFERENCES woor.users (id),
  event        woor.location_event NOT NULL,
  geohash6     text NOT NULL CHECK (geohash6 ~ '^[0-9b-hjkmnp-z]{6}$'),
  accuracy_m   integer CHECK (accuracy_m BETWEEN 0 AND 5000),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT location_once_per_event UNIQUE (order_id, event)
);
COMMENT ON TABLE woor.location_proofs IS 'Position du livreur à l''arrivée et à la déclaration d''absence, arrondie à environ 1 km (geohash de 6 caractères). Aucun suivi continu.';

-- ---------------------------------------------------------------------
-- 9. Exploitation : boîte d'envoi, réconciliation
-- ---------------------------------------------------------------------
CREATE TABLE woor.outbox (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic         text NOT NULL CHECK (topic ~ '^[a-z_]+(\.[a-z_]+)+$'),
  order_id      uuid REFERENCES woor.orders (id),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  available_at  timestamptz NOT NULL DEFAULT now(),
  attempts      smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_until  timestamptz,
  processed_at  timestamptz,
  last_error    text CHECK (char_length(last_error) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE woor.outbox IS 'Boîte d''envoi transactionnelle : écrite avec le changement d''état, lue par le service de paiements (FOR UPDATE SKIP LOCKED).';

CREATE TABLE woor.reconciliation_runs (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at          timestamptz NOT NULL DEFAULT now(),
  finished_at         timestamptz,
  lnd_payments_seen   integer CHECK (lnd_payments_seen >= 0),
  unmatched_payments  integer CHECK (unmatched_payments >= 0),
  held_htlcs          integer CHECK (held_htlcs >= 0),
  min_margin_blocks   integer,
  hot_balance_msat    bigint,
  status              text NOT NULL CHECK (status IN ('running', 'ok', 'mismatch', 'error')),
  details             jsonb
);
COMMENT ON TABLE woor.reconciliation_runs IS 'Chaque minute : paiements sortants de LND comparés aux versements, HTLC tenus, marge en blocs, solde chaud.';

-- ---------------------------------------------------------------------
-- 10. Index
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX credentials_one_pin_per_user        ON woor.credentials (user_id) WHERE kind = 'pin';
CREATE INDEX sessions_active_by_user                    ON woor.sessions (user_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX payout_address_changes_one_pending  ON woor.payout_address_changes (user_id) WHERE state = 'pending';
CREATE INDEX orders_by_seller                           ON woor.orders (seller_id, created_at DESC);
CREATE INDEX orders_by_courier                          ON woor.orders (courier_id, state);
CREATE INDEX orders_by_device                           ON woor.orders (buyer_device_hash) WHERE buyer_device_hash IS NOT NULL;
CREATE INDEX orders_open_timers                         ON woor.orders (state) WHERE state IN ('awaiting_payment', 'locked', 'in_transit', 'disputed');
CREATE INDEX orders_purge                               ON woor.orders (purge_after) WHERE pii_purged_at IS NULL;
CREATE INDEX invoices_held                              ON woor.invoices (state) WHERE state IN ('open', 'accepted', 'settling', 'cancelling');
CREATE INDEX payouts_due                                ON woor.payouts (release_at) WHERE state IN ('scheduled', 'pending', 'failed');
CREATE INDEX payouts_by_beneficiary                     ON woor.payouts (beneficiary_id, created_at DESC);
CREATE UNIQUE INDEX disputes_one_open_per_order         ON woor.disputes (order_id) WHERE state = 'open';
CREATE INDEX disputes_open                              ON woor.disputes (decide_before) WHERE state = 'open';
CREATE INDEX dispute_evidence_by_case                   ON woor.dispute_evidence (dispute_id);
CREATE INDEX strikes_by_user                            ON woor.strikes (user_id);
CREATE INDEX outbox_ready                               ON woor.outbox (available_at) WHERE processed_at IS NULL;

-- ---------------------------------------------------------------------
-- 11. Journal d'audit chaîné
-- ---------------------------------------------------------------------
CREATE TABLE audit.events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seq          bigint NOT NULL UNIQUE,
  occurred_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  order_id     uuid,
  actor_role   woor.app_role NOT NULL,
  actor_user   uuid,
  action       text NOT NULL CHECK (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash    bytea,
  hash         bytea NOT NULL
);
CREATE INDEX audit_events_by_order ON audit.events (order_id, seq);
COMMENT ON TABLE audit.events IS 'Journal en ajout seul, sans donnée personnelle. Chaque ligne contient le SHA-256 de la précédente : une modification casse la chaîne.';

CREATE FUNCTION audit.event_digest(p_prev bytea, p_occurred timestamptz, p_order uuid, p_role woor.app_role,
                                   p_user uuid, p_action text, p_data jsonb) RETURNS bytea
LANGUAGE sql STABLE AS $$
  SELECT sha256(convert_to(concat_ws('|',
           encode(coalesce(p_prev, '\x'::bytea), 'hex'),
           to_char(p_occurred AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
           coalesce(p_order::text, ''),
           p_role::text,
           coalesce(p_user::text, ''),
           p_action,
           p_data::text), 'UTF8'))
$$;

CREATE FUNCTION audit.trg_chain() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, audit, woor AS $$
DECLARE
  v_prev_hash bytea;
  v_prev_seq  bigint;
BEGIN
  -- Une écriture à la fois dans la chaîne, jusqu'à la fin de la transaction (niveau READ COMMITTED).
  PERFORM pg_advisory_xact_lock(hashtext('audit.events.chain'));
  SELECT e.hash, e.seq INTO v_prev_hash, v_prev_seq FROM audit.events e ORDER BY e.seq DESC LIMIT 1;
  NEW.seq         := coalesce(v_prev_seq, 0) + 1;
  NEW.occurred_at := clock_timestamp();
  NEW.prev_hash   := v_prev_hash;
  NEW.hash        := audit.event_digest(v_prev_hash, NEW.occurred_at, NEW.order_id, NEW.actor_role,
                                        NEW.actor_user, NEW.action, NEW.data);
  RETURN NEW;
END
$$;

CREATE FUNCTION audit.trg_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_append_only: audit.events n''accepte ni %', TG_OP USING ERRCODE = '42501';
END
$$;

CREATE TRIGGER events_chain BEFORE INSERT ON audit.events
  FOR EACH ROW EXECUTE FUNCTION audit.trg_chain();
CREATE TRIGGER events_no_update_delete BEFORE UPDATE OR DELETE ON audit.events
  FOR EACH ROW EXECUTE FUNCTION audit.trg_append_only();
CREATE TRIGGER events_no_truncate BEFORE TRUNCATE ON audit.events
  FOR EACH STATEMENT EXECUTE FUNCTION audit.trg_append_only();

CREATE FUNCTION audit.verify_chain() RETURNS TABLE (ok boolean, checked bigint, first_bad_seq bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, audit, woor AS $$
DECLARE
  r        record;
  v_prev   bytea := NULL;
  v_count  bigint := 0;
BEGIN
  FOR r IN SELECT * FROM audit.events ORDER BY seq LOOP
    v_count := v_count + 1;
    IF r.seq <> v_count OR r.prev_hash IS DISTINCT FROM v_prev
       OR r.hash <> audit.event_digest(r.prev_hash, r.occurred_at, r.order_id, r.actor_role,
                                       r.actor_user, r.action, r.data) THEN
      RETURN QUERY SELECT false, v_count, r.seq;
      RETURN;
    END IF;
    v_prev := r.hash;
  END LOOP;
  RETURN QUERY SELECT true, v_count, NULL::bigint;
END
$$;
COMMENT ON FUNCTION audit.verify_chain() IS 'Recalcule toute la chaîne. Lancée chaque nuit et avant chaque export du journal.';

CREATE FUNCTION woor.log_event(p_order uuid, p_role woor.app_role, p_user uuid, p_action text,
                               p_data jsonb DEFAULT '{}'::jsonb) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
  INSERT INTO audit.events (seq, order_id, actor_role, actor_user, action, data, hash)
  VALUES (0, p_order, p_role, p_user, p_action, coalesce(p_data, '{}'::jsonb), '\x'::bytea);
$$;
COMMENT ON FUNCTION woor.log_event IS 'Écrit une ligne d''audit ; numéro, horodatage et empreintes sont calculés par le déclencheur.';

-- ---------------------------------------------------------------------
-- 12. Réglages : lecture typée
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.setting_int(p_key text) RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  v bigint;
BEGIN
  SELECT s.value INTO v FROM woor.settings s WHERE s.key = p_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'setting_missing: %', p_key USING ERRCODE = 'P0001';
  END IF;
  RETURN v;
END
$$;

-- ---------------------------------------------------------------------
-- 13. Déclencheurs d'intégrité
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.trg_seller_courier_parties() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM woor.users WHERE id = NEW.seller_id AND role = 'seller' AND status IN ('invited', 'active')) THEN
    RAISE EXCEPTION 'seller_required' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM woor.users WHERE id = NEW.courier_id AND role = 'courier' AND status IN ('invited', 'active')) THEN
    RAISE EXCEPTION 'courier_required' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION woor.assert_order_parties(p_seller uuid, p_courier uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  v_check boolean := woor.setting_int('require_identity_check') = 1;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM woor.users WHERE id = p_seller AND role = 'seller' AND status = 'active'
                    AND (NOT v_check OR identity_checked_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'seller_not_ready: vendeuse inactive ou identité non vérifiée' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM woor.users WHERE id = p_courier AND role = 'courier' AND status = 'active'
                    AND (NOT v_check OR identity_checked_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'courier_not_ready: livreur inactif ou identité non vérifiée' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM woor.seller_couriers WHERE seller_id = p_seller AND courier_id = p_courier) THEN
    RAISE EXCEPTION 'courier_not_linked: ce livreur ne travaille pas avec cette vendeuse' USING ERRCODE = '23514';
  END IF;
END
$$;

CREATE FUNCTION woor.trg_orders_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (SELECT engaged FROM woor.kill_switch) THEN
      RAISE EXCEPTION 'service_paused: interrupteur général activé' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.state <> 'awaiting_payment' OR NEW.buyer_device_hash IS NOT NULL OR NEW.delivery_code_hmac IS NOT NULL THEN
      RAISE EXCEPTION 'invalid_new_order: une commande naît à payer, sans appareil ni code' USING ERRCODE = '23514';
    END IF;
    PERFORM woor.assert_order_parties(NEW.seller_id, NEW.courier_id);
    IF NEW.item_price_xof > woor.setting_int('max_order_xof') THEN
      RAISE EXCEPTION 'cap_order: prix au-dessus du plafond par commande' USING ERRCODE = 'P0001';
    END IF;
    IF (SELECT count(*) FROM woor.orders
         WHERE seller_id = NEW.seller_id AND created_at > now() - interval '24 hours')
       >= woor.setting_int('seller_orders_per_day') THEN
      RAISE EXCEPTION 'daily_limit: trop de commandes créées en 24 h' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.public_token_hash IS DISTINCT FROM OLD.public_token_hash
       OR NEW.item_price_xof IS DISTINCT FROM OLD.item_price_xof OR NEW.delivery_fee_xof IS DISTINCT FROM OLD.delivery_fee_xof
       OR NEW.item_label IS DISTINCT FROM OLD.item_label OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'order_immutable: vendeuse, lien, article et montants ne changent pas' USING ERRCODE = '23514';
    END IF;
    IF NEW.courier_id IS DISTINCT FROM OLD.courier_id THEN
      IF OLD.state <> 'awaiting_payment' THEN
        RAISE EXCEPTION 'courier_locked: le livreur ne change plus après le blocage' USING ERRCODE = '23514';
      END IF;
      PERFORM woor.assert_order_parties(NEW.seller_id, NEW.courier_id);
    END IF;
    IF OLD.buyer_device_hash IS NOT NULL AND NEW.buyer_device_hash IS DISTINCT FROM OLD.buyer_device_hash
       AND NOT (NEW.buyer_device_hash IS NULL AND NEW.pii_purged_at IS NOT NULL) THEN
      RAISE EXCEPTION 'device_bound: l''appareil lié ne change pas' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION woor.trg_invoice_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  v_order woor.order_state;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT state INTO v_order FROM woor.orders WHERE id = NEW.order_id;
    IF v_order <> 'awaiting_payment' OR NEW.state <> 'open' THEN
      RAISE EXCEPTION 'invoice_not_allowed: factures seulement pour une commande à payer' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.order_id <> OLD.order_id OR NEW.kind <> OLD.kind OR NEW.payment_hash <> OLD.payment_hash
     OR NEW.amount_msat <> OLD.amount_msat OR NEW.amount_xof <> OLD.amount_xof OR NEW.bolt11 <> OLD.bolt11 THEN
    RAISE EXCEPTION 'invoice_immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.state = OLD.state THEN
    RETURN NEW;
  END IF;
  IF OLD.state IN ('settled', 'cancelled') THEN
    RAISE EXCEPTION 'invoice_final: une facture % ne change plus', OLD.state USING ERRCODE = '23514';
  END IF;
  IF OLD.state = 'settling' AND NEW.state <> 'settled' THEN
    RAISE EXCEPTION 'invoice_settling: un règlement commencé ne peut que se terminer' USING ERRCODE = '23514';
  END IF;
  IF NEW.state = 'settling' THEN
    -- Le seul sens qui encaisse : permis uniquement si la machine à états l'a décidé.
    SELECT state INTO v_order FROM woor.orders WHERE id = NEW.order_id;
    IF OLD.state <> 'accepted'
       OR NOT ((NEW.kind = 'item' AND v_order = 'delivered')
            OR (NEW.kind = 'delivery_fee' AND v_order IN ('delivered', 'courier_paid'))) THEN
      RAISE EXCEPTION 'settle_refused: facture % non encaissable, commande %', NEW.kind, v_order USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.state = 'settled' AND OLD.state <> 'settling' THEN
    RAISE EXCEPTION 'settle_without_intent: passer par settling avant d''appeler le nœud' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION woor.trg_payout_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  v_order    woor.orders%ROWTYPE;
  v_fee      woor.invoices%ROWTYPE;
  v_item     woor.invoices%ROWTYPE;
  v_dispute  woor.disputes%ROWTYPE;
  v_limit    bigint;
  v_used     bigint;
BEGIN
  SELECT * INTO v_order FROM woor.orders WHERE id = NEW.order_id;
  SELECT * INTO v_fee  FROM woor.invoices WHERE order_id = NEW.order_id AND kind = 'delivery_fee';
  SELECT * INTO v_item FROM woor.invoices WHERE order_id = NEW.order_id AND kind = 'item';
  IF NEW.dispute_id IS NOT NULL THEN
    SELECT * INTO v_dispute FROM woor.disputes WHERE id = NEW.dispute_id AND order_id = NEW.order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'payout_wrong_dispute' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.state NOT IN ('scheduled', 'pending', 'needs_attention') THEN
      RAISE EXCEPTION 'payout_bad_initial_state' USING ERRCODE = '23514';
    END IF;
    CASE NEW.kind
      WHEN 'seller' THEN
        v_limit := v_item.amount_msat;
        IF v_order.state <> 'delivered' OR v_item.state IS DISTINCT FROM 'settled' OR NEW.beneficiary_id <> v_order.seller_id THEN
          RAISE EXCEPTION 'payout_refused: versement vendeuse sans article encaissé' USING ERRCODE = '23514';
        END IF;
      WHEN 'courier' THEN
        v_limit := v_fee.amount_msat;
        IF v_order.state NOT IN ('delivered', 'courier_paid') OR v_fee.state IS DISTINCT FROM 'settled'
           OR NEW.beneficiary_id <> v_order.courier_id THEN
          RAISE EXCEPTION 'payout_refused: versement livreur sans course encaissée' USING ERRCODE = '23514';
        END IF;
      WHEN 'buyer_refund' THEN
        v_limit := coalesce(v_item.amount_msat, 0) + coalesce(v_fee.amount_msat, 0);
        IF v_order.state <> 'refunded' OR v_item.state IS DISTINCT FROM 'settled' OR v_fee.state IS DISTINCT FROM 'settled'
           OR v_dispute.decision IS DISTINCT FROM 'refund_buyer'
           OR EXISTS (SELECT 1 FROM woor.payouts p WHERE p.order_id = NEW.order_id
                       AND p.kind IN ('seller', 'courier') AND p.state <> 'cancelled') THEN
          RAISE EXCEPTION 'payout_refused: remboursement sans décision ou versements non annulés' USING ERRCODE = '23514';
        END IF;
      WHEN 'courier_compensation' THEN
        v_limit := v_fee.amount_msat;
        IF v_order.state <> 'refunded' OR NOT v_dispute.courier_compensated OR NEW.beneficiary_id <> v_order.courier_id THEN
          RAISE EXCEPTION 'payout_refused: dédommagement sans décision d''arbitre' USING ERRCODE = '23514';
        END IF;
        SELECT coalesce(sum(amount_xof), 0) INTO v_used FROM woor.payouts
         WHERE kind = 'courier_compensation' AND state <> 'cancelled';
        IF v_used + NEW.amount_xof > woor.setting_int('pilot_fund_cap_xof') THEN
          RAISE EXCEPTION 'cap_pilot_fund: fonds du pilote épuisé' USING ERRCODE = 'P0001';
        END IF;
    END CASE;
    IF v_limit IS NULL OR NEW.amount_msat > v_limit THEN
      RAISE EXCEPTION 'payout_exceeds_collected: % msat demandés, % msat au plus', NEW.amount_msat, v_limit USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- Mise à jour
  IF NEW.order_id <> OLD.order_id OR NEW.kind <> OLD.kind OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
     OR NEW.amount_msat <> OLD.amount_msat OR NEW.amount_xof <> OLD.amount_xof OR NEW.max_fee_msat <> OLD.max_fee_msat
     OR NEW.dispute_id IS DISTINCT FROM OLD.dispute_id THEN
    RAISE EXCEPTION 'payout_immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.state IN ('succeeded', 'cancelled') AND NEW.state <> OLD.state THEN
    RAISE EXCEPTION 'payout_final: un versement % ne change plus', OLD.state USING ERRCODE = '23514';
  END IF;
  IF OLD.state = 'in_flight' AND NEW.state NOT IN ('in_flight', 'succeeded', 'failed') THEN
    RAISE EXCEPTION 'payout_in_flight: attendre le résultat du nœud' USING ERRCODE = '23514';
  END IF;
  IF OLD.state IN ('in_flight', 'succeeded') AND NEW.payment_hash IS DISTINCT FROM OLD.payment_hash THEN
    RAISE EXCEPTION 'payout_double: pas de nouvelle facture tant que la précédente est en cours' USING ERRCODE = '23514';
  END IF;
  IF NEW.state = 'in_flight' AND OLD.state <> 'in_flight' THEN
    IF OLD.state NOT IN ('pending', 'failed') OR NEW.release_at > now() THEN
      RAISE EXCEPTION 'payout_not_due' USING ERRCODE = '23514';
    END IF;
    IF NEW.kind IN ('seller', 'courier')
       AND EXISTS (SELECT 1 FROM woor.disputes d WHERE d.order_id = NEW.order_id AND d.state = 'open') THEN
      RAISE EXCEPTION 'payout_frozen: litige ouvert sur cette commande' USING ERRCODE = '23514';
    END IF;
    IF NEW.kind = 'buyer_refund' THEN
      IF NEW.destination IS DISTINCT FROM v_dispute.refund_destination THEN
        RAISE EXCEPTION 'payout_wrong_destination' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.destination IS DISTINCT FROM (SELECT payout_ln_address FROM woor.users WHERE id = NEW.beneficiary_id) THEN
      RAISE EXCEPTION 'payout_wrong_destination: seule l''adresse enregistrée du bénéficiaire est payable' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.state = 'succeeded' AND OLD.state <> 'in_flight' THEN
    RAISE EXCEPTION 'payout_success_without_flight' USING ERRCODE = '23514';
  END IF;
  IF NEW.state = 'cancelled' AND OLD.state NOT IN ('scheduled', 'pending', 'held', 'failed', 'needs_attention') THEN
    RAISE EXCEPTION 'payout_cancel_refused' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION woor.trg_payout_completed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF NEW.state = 'succeeded' AND OLD.state <> 'succeeded' THEN
    PERFORM woor.log_event(NEW.order_id, 'system', NULL, 'payout.succeeded',
                           jsonb_build_object('kind', NEW.kind, 'amount_xof', NEW.amount_xof, 'fee_msat', NEW.fee_msat));
    IF (SELECT state FROM woor.orders WHERE id = NEW.order_id) = 'delivered'
       AND NOT EXISTS (SELECT 1 FROM woor.payouts p WHERE p.order_id = NEW.order_id
                        AND p.kind IN ('seller', 'courier') AND p.state <> 'succeeded')
       AND (SELECT count(*) FROM woor.payouts p WHERE p.order_id = NEW.order_id AND p.kind IN ('seller', 'courier')) = 2 THEN
      PERFORM woor.apply_order_event(NEW.order_id, 'payouts_done', 'system');
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION woor.trg_credential_added() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  UPDATE woor.users SET status = 'active' WHERE id = NEW.user_id AND status = 'invited';
  PERFORM woor.log_event(NULL, (SELECT role FROM woor.users WHERE id = NEW.user_id), NEW.user_id,
                         'credential.added', jsonb_build_object('kind', NEW.kind));
  RETURN NEW;
END
$$;

CREATE FUNCTION woor.trg_credential_keep_one() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM woor.credentials WHERE user_id = OLD.user_id AND id <> OLD.id)
     AND (SELECT status FROM woor.users WHERE id = OLD.user_id) <> 'closed' THEN
    RAISE EXCEPTION 'last_credential: ajouter une autre passkey ou un PIN avant de supprimer celle-ci' USING ERRCODE = '23514';
  END IF;
  PERFORM woor.log_event(NULL, (SELECT role FROM woor.users WHERE id = OLD.user_id), OLD.user_id,
                         'credential.removed', jsonb_build_object('kind', OLD.kind));
  RETURN OLD;
END
$$;

CREATE TRIGGER users_updated_at    BEFORE UPDATE ON woor.users    FOR EACH ROW EXECUTE FUNCTION woor.trg_set_updated_at();
CREATE TRIGGER orders_updated_at   BEFORE UPDATE ON woor.orders   FOR EACH ROW EXECUTE FUNCTION woor.trg_set_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON woor.invoices FOR EACH ROW EXECUTE FUNCTION woor.trg_set_updated_at();
CREATE TRIGGER payouts_updated_at  BEFORE UPDATE ON woor.payouts  FOR EACH ROW EXECUTE FUNCTION woor.trg_set_updated_at();

CREATE TRIGGER seller_couriers_parties BEFORE INSERT ON woor.seller_couriers
  FOR EACH ROW EXECUTE FUNCTION woor.trg_seller_courier_parties();
CREATE TRIGGER orders_guard BEFORE INSERT OR UPDATE ON woor.orders
  FOR EACH ROW EXECUTE FUNCTION woor.trg_orders_guard();
CREATE TRIGGER invoices_guard BEFORE INSERT OR UPDATE ON woor.invoices
  FOR EACH ROW EXECUTE FUNCTION woor.trg_invoice_guard();
CREATE TRIGGER payouts_guard BEFORE INSERT OR UPDATE ON woor.payouts
  FOR EACH ROW EXECUTE FUNCTION woor.trg_payout_guard();
CREATE TRIGGER payouts_completed AFTER UPDATE OF state ON woor.payouts
  FOR EACH ROW EXECUTE FUNCTION woor.trg_payout_completed();
CREATE TRIGGER credentials_added AFTER INSERT ON woor.credentials
  FOR EACH ROW EXECUTE FUNCTION woor.trg_credential_added();
CREATE TRIGGER credentials_keep_one BEFORE DELETE ON woor.credentials
  FOR EACH ROW EXECUTE FUNCTION woor.trg_credential_keep_one();

-- ---------------------------------------------------------------------
-- 14. Vues
-- ---------------------------------------------------------------------
CREATE VIEW woor.v_locked_totals AS
SELECT coalesce(sum(amount_xof) FILTER (WHERE state IN ('open', 'accepted', 'settling')), 0)::bigint AS committed_xof,
       coalesce(sum(amount_xof) FILTER (WHERE state IN ('accepted', 'settling')), 0)::bigint         AS locked_xof,
       count(*) FILTER (WHERE state IN ('open', 'accepted', 'settling'))                            AS committed_invoices,
       count(*) FILTER (WHERE state IN ('accepted', 'settling'))                                    AS held_htlcs
FROM woor.invoices;
COMMENT ON VIEW woor.v_locked_totals IS 'Engagé (factures ouvertes comprises) et réellement bloqué, pour les plafonds et le tableau de bord.';

CREATE VIEW woor.v_seller_reputation AS
SELECT u.id AS seller_id,
       (SELECT count(*) FROM woor.orders o WHERE o.seller_id = u.id AND o.state IN ('delivered', 'paid_out')) AS successful_deliveries,
       (SELECT count(*) FROM woor.orders o WHERE o.seller_id = u.id AND o.state = 'courier_paid')            AS refused_or_absent,
       (SELECT count(*) FROM woor.disputes d JOIN woor.orders o ON o.id = d.order_id WHERE o.seller_id = u.id) AS disputes,
       (SELECT count(*) FROM woor.strikes s WHERE s.user_id = u.id)                                          AS strikes,
       (SELECT max(o.delivered_at) FROM woor.orders o WHERE o.seller_id = u.id)                             AS last_delivery_at
FROM woor.users u
WHERE u.role = 'seller';
COMMENT ON VIEW woor.v_seller_reputation IS 'Pastille de confiance : seul successful_deliveries est montré aux acheteurs.';

CREATE VIEW woor.v_courier_record AS
SELECT u.id AS courier_id,
       (SELECT count(*) FROM woor.orders o WHERE o.courier_id = u.id AND o.state IN ('delivered', 'paid_out'))         AS deliveries,
       (SELECT count(*) FROM woor.orders o WHERE o.courier_id = u.id AND o.no_show_declared_at IS NOT NULL)          AS no_show_declared,
       (SELECT count(*) FROM woor.orders o WHERE o.courier_id = u.id AND o.refusal_declared_at IS NOT NULL)          AS refusals_declared,
       (SELECT count(*) FROM woor.orders o WHERE o.courier_id = u.id AND o.code_locked_at IS NOT NULL)               AS codes_locked,
       (SELECT count(*) FROM woor.disputes d JOIN woor.orders o ON o.id = d.order_id
         WHERE o.courier_id = u.id AND d.reason IN ('no_show_contested', 'refusal_contested'))                       AS contested
FROM woor.users u
WHERE u.role = 'courier';
COMMENT ON VIEW woor.v_courier_record IS 'Historique du livreur, consulté par l''arbitre pour juger une absence déclarée.';

CREATE VIEW woor.v_due_timers AS
SELECT t.order_id, t.state, t.due_event
FROM (
  SELECT o.id AS order_id, o.state,
         CASE
           WHEN o.state IN ('locked', 'in_transit', 'disputed') AND o.hard_stop_at < now() THEN 'hard_stop'
           WHEN o.state IN ('locked', 'disputed') AND EXISTS (
                  SELECT 1 FROM woor.disputes d WHERE d.order_id = o.id AND d.state = 'open'
                     AND NOT d.post_delivery AND d.decide_before < now())                   THEN 'dispute_timeout'
           WHEN o.state = 'awaiting_payment'
                AND (o.pay_deadline < now()
                     OR (o.pay_deadline IS NULL AND o.created_at + woor.secs(woor.setting_int('order_link_ttl_sec')) < now()))
                                                                                             THEN 'payment_timeout'
           WHEN o.state = 'locked' AND o.pickup_deadline < now()                             THEN 'pickup_timeout'
           WHEN o.state = 'in_transit' AND o.refusal_declared_at IS NOT NULL AND o.contest_deadline < now() THEN 'refusal_confirmed'
           WHEN o.state = 'in_transit' AND o.no_show_declared_at IS NOT NULL AND o.contest_deadline < now() THEN 'no_show_confirmed'
         END AS due_event
  FROM woor.orders o
  WHERE o.state IN ('awaiting_payment', 'locked', 'in_transit', 'disputed')
) t
WHERE t.due_event IS NOT NULL;
COMMENT ON VIEW woor.v_due_timers IS 'Balayée chaque minute par le planificateur (timer.fire), en plus des tâches différées.';

CREATE VIEW woor.v_order_stats AS
SELECT date_trunc('day', created_at)::date AS day, state, count(*) AS orders, sum(total_xof)::bigint AS total_xof
FROM woor.orders
GROUP BY 1, 2;
COMMENT ON VIEW woor.v_order_stats IS 'Mesures du pilote par jour et par état, sans donnée personnelle.';

CREATE VIEW woor.v_user_strikes WITH (security_invoker = true) AS
SELECT user_id, count(*) AS strikes, max(created_at) AS last_strike_at
FROM woor.strikes
GROUP BY user_id;
COMMENT ON VIEW woor.v_user_strikes IS 'Avertissements par compte ; la RLS de woor.strikes s''applique (security_invoker).';

CREATE VIEW woor.v_alerts AS
WITH last_run AS (SELECT * FROM woor.reconciliation_runs ORDER BY id DESC LIMIT 1)
SELECT 'kill_switch'::text AS kind, NULL::uuid AS order_id, 'critical'::text AS severity,
       k.engaged_at AS since, coalesce(k.engaged_reason, '') AS detail
  FROM woor.kill_switch k WHERE k.engaged
UNION ALL
SELECT 'dispute_open', d.order_id,
       CASE WHEN d.decide_before < now() + interval '30 minutes' THEN 'critical' ELSE 'warning' END,
       d.created_at, d.reason::text
  FROM woor.disputes d WHERE d.state = 'open'
UNION ALL
SELECT 'payout_blocked', p.order_id, 'warning', p.updated_at, p.kind::text || ' ' || p.state::text
  FROM woor.payouts p WHERE p.state = 'needs_attention' OR (p.state = 'failed' AND p.attempts >= 4)
UNION ALL
SELECT 'reconciliation', NULL, 'critical', r.started_at, r.status FROM last_run r WHERE r.status IN ('mismatch', 'error')
UNION ALL
SELECT 'reconciliation_stale', NULL, 'critical', max(started_at), 'aucune réconciliation depuis 5 min'
  FROM woor.reconciliation_runs HAVING coalesce(max(started_at), '-infinity') < now() - interval '5 minutes'
UNION ALL
SELECT 'htlc_margin', NULL, 'critical', r.started_at, r.min_margin_blocks::text || ' blocs'
  FROM last_run r WHERE r.min_margin_blocks < woor.setting_int('safety_margin_blocks')
UNION ALL
SELECT 'hard_stop_soon', o.id, 'warning', o.hard_stop_at, o.state::text
  FROM woor.orders o WHERE o.state IN ('locked', 'in_transit', 'disputed') AND o.hard_stop_at < now() + interval '1 hour'
UNION ALL
SELECT 'cap_near', NULL, 'warning', now(), t.committed_xof::text || ' F engagés'
  FROM woor.v_locked_totals t WHERE t.committed_xof > woor.setting_int('max_total_locked_xof') * 8 / 10;
COMMENT ON VIEW woor.v_alerts IS 'Alertes du tableau de bord de l''arbitre. Aucune donnée personnelle.';

-- ---------------------------------------------------------------------
-- 15. Comptes, connexion, sessions (SECURITY DEFINER : chaque fonction
--     vérifie elle-même qui agit ; l'API n'écrit pas ces tables en direct)
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.ctx_session() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('woor.session_id', true), '')::uuid $$;
COMMENT ON FUNCTION woor.ctx_session() IS 'Session de la requête, posée par l''API avec woor.user_id.';

CREATE FUNCTION woor.assert_reauth() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM woor.sessions s
                  WHERE s.id = woor.ctx_session() AND s.user_id = woor.ctx_user() AND s.revoked_at IS NULL
                    AND s.expires_at > now() AND s.reauth_at > now() - woor.secs(woor.setting_int('reauth_window_sec'))) THEN
    RAISE EXCEPTION 'reauth_required: confirmez avec votre passkey' USING ERRCODE = '42501';
  END IF;
END
$$;
COMMENT ON FUNCTION woor.assert_reauth() IS 'Exige une passkey redemandée depuis moins de 5 min sur la session courante.';

CREATE FUNCTION woor.active_staff(p_user uuid, p_roles woor.app_role[]) RETURNS woor.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
  SELECT role FROM woor.users WHERE id = p_user AND status = 'active' AND role = ANY (p_roles)
$$;

-- Permissions -----------------------------------------------------------
CREATE FUNCTION woor.current_permissions() RETURNS TABLE (permission text, scope woor.permission_scope)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
  SELECT rp.permission, rp.scope FROM woor.role_permissions rp WHERE rp.role = woor.ctx_role() ORDER BY 1
$$;

CREATE FUNCTION woor.has_permission(p_permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
  SELECT EXISTS (SELECT 1 FROM woor.role_permissions rp WHERE rp.role = woor.ctx_role() AND rp.permission = p_permission)
$$;

-- Invitations -----------------------------------------------------------
CREATE FUNCTION woor.create_bootstrap_invite(p_code_hash bytea, p_phone_hmac bytea DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM woor.users WHERE role = 'admin' AND status IN ('invited', 'active')) THEN
    RAISE EXCEPTION 'bootstrap_done: un administrateur existe déjà' USING ERRCODE = '42501';
  END IF;
  INSERT INTO woor.invites (code_hash, role, phone_hmac, expires_at)
  VALUES (p_code_hash, 'admin', p_phone_hmac, now() + interval '48 hours') RETURNING id INTO v_id;
  PERFORM woor.log_event(NULL, 'system', NULL, 'invite.bootstrap', jsonb_build_object('invite_id', v_id));
  RETURN v_id;
END
$$;
COMMENT ON FUNCTION woor.create_bootstrap_invite IS 'Amorçage : invitation du premier administrateur, exécutée par woor_owner. Refusée ensuite.';

CREATE FUNCTION woor.create_invite(p_code_hash bytea, p_role woor.app_role, p_phone_hmac bytea DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_actor  uuid := woor.ctx_user();
  v_role   woor.app_role := woor.active_staff(v_actor, ARRAY['admin', 'seller']::woor.app_role[]);
  v_id     uuid;
BEGIN
  IF v_role IS NULL OR p_role NOT IN ('seller', 'courier', 'arbiter', 'admin')
     OR (v_role = 'seller' AND p_role <> 'courier') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF p_role IN ('arbiter', 'admin') THEN
    PERFORM woor.assert_reauth();
  END IF;
  IF v_role = 'seller' AND (SELECT count(*) FROM woor.invites
                             WHERE created_by = v_actor AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now())
                           >= woor.setting_int('seller_open_invites') THEN
    RAISE EXCEPTION 'too_many_invites' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO woor.invites (code_hash, role, phone_hmac, created_by, expires_at)
  VALUES (p_code_hash, p_role, p_phone_hmac, v_actor, now() + woor.secs(woor.setting_int('invite_ttl_sec')))
  RETURNING id INTO v_id;
  PERFORM woor.log_event(NULL, v_role, v_actor, 'invite.created', jsonb_build_object('invite_id', v_id, 'role', p_role));
  RETURN v_id;
END
$$;

CREATE FUNCTION woor.revoke_invite(p_invite uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  UPDATE woor.invites SET revoked_at = now()
   WHERE id = p_invite AND used_at IS NULL AND revoked_at IS NULL
     AND (created_by = woor.ctx_user() OR woor.active_staff(woor.ctx_user(), ARRAY['admin']::woor.app_role[]) IS NOT NULL);
  IF FOUND THEN
    PERFORM woor.log_event(NULL, woor.ctx_role(), woor.ctx_user(), 'invite.revoked', jsonb_build_object('invite_id', p_invite));
  END IF;
  RETURN FOUND;
END
$$;

CREATE FUNCTION woor.accept_invite(p_code_hash bytea, p_phone_hmac bytea, p_phone_enc bytea, p_phone_key_id smallint,
                                   p_phone_last2 text, p_display_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  i        woor.invites%ROWTYPE;
  v_user   uuid;
BEGIN
  SELECT * INTO i FROM woor.invites WHERE code_hash = p_code_hash FOR UPDATE;
  -- Même réponse pour une invitation inconnue, utilisée, révoquée, expirée ou réservée à un autre numéro.
  IF NOT FOUND OR i.used_at IS NOT NULL OR i.revoked_at IS NOT NULL OR i.expires_at < now()
     OR (i.phone_hmac IS NOT NULL AND i.phone_hmac <> p_phone_hmac) THEN
    RAISE EXCEPTION 'invite_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM woor.users WHERE phone_hmac = p_phone_hmac) THEN
    RAISE EXCEPTION 'phone_taken: ce numéro a déjà un compte' USING ERRCODE = '23505';
  END IF;
  INSERT INTO woor.users (role, display_name, phone_enc, phone_key_id, phone_hmac, phone_last2, status)
  VALUES (i.role, p_display_name, p_phone_enc, p_phone_key_id, p_phone_hmac, p_phone_last2, 'invited')
  RETURNING id INTO v_user;
  UPDATE woor.invites SET used_by = v_user, used_at = now() WHERE id = i.id;
  IF i.role = 'courier' AND (SELECT role FROM woor.users WHERE id = i.created_by) = 'seller' THEN
    INSERT INTO woor.seller_couriers (seller_id, courier_id, created_by) VALUES (i.created_by, v_user, i.created_by);
  END IF;
  PERFORM woor.log_event(NULL, i.role, v_user, 'account.created',
                         jsonb_build_object('invite_id', i.id, 'invited_by', i.created_by));
  RETURN v_user;
END
$$;
COMMENT ON FUNCTION woor.accept_invite IS 'Crée le compte (statut invited) ; il devient active à l''enregistrement de sa première passkey ou de son PIN.';

-- Connexion -------------------------------------------------------------
CREATE FUNCTION woor.login_lookup(p_phone_hmac bytea)
RETURNS TABLE (user_id uuid, role woor.app_role, status woor.user_status, pin_credential_id uuid,
               pin_hash text, pin_locked_until timestamptz, passkeys integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
  SELECT u.id, u.role, u.status, c.id, c.pin_hash, c.locked_until,
         (SELECT count(*)::integer FROM woor.credentials k WHERE k.user_id = u.id AND k.kind = 'passkey')
  FROM woor.users u
  LEFT JOIN woor.credentials c ON c.user_id = u.id AND c.kind = 'pin'
  WHERE u.phone_hmac = p_phone_hmac AND u.status <> 'closed'
$$;
COMMENT ON FUNCTION woor.login_lookup IS 'Connexion par numéro + PIN. Si rien n''est trouvé, l''API calcule quand même un Argon2id factice (temps constant).';

CREATE FUNCTION woor.passkey_lookup(p_webauthn_id bytea)
RETURNS TABLE (credential_id uuid, user_id uuid, role woor.app_role, status woor.user_status,
               public_key bytea, sign_count bigint, transports text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
  SELECT c.id, u.id, u.role, u.status, c.public_key, c.sign_count, c.transports
  FROM woor.credentials c JOIN woor.users u ON u.id = c.user_id
  WHERE c.webauthn_id = p_webauthn_id AND c.kind = 'passkey' AND u.status <> 'closed'
$$;

CREATE FUNCTION woor.record_login(p_credential uuid, p_success boolean, p_sign_count bigint DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  c woor.credentials%ROWTYPE;
  u woor.users%ROWTYPE;
BEGIN
  SELECT * INTO c FROM woor.credentials WHERE id = p_credential FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  SELECT * INTO u FROM woor.users WHERE id = c.user_id;
  IF c.locked_until > now() THEN
    PERFORM woor.log_event(NULL, u.role, u.id, 'auth.locked_attempt', jsonb_build_object('kind', c.kind));
    RETURN 'locked';
  END IF;
  IF NOT p_success THEN
    IF c.failed_attempts + 1 >= woor.setting_int('pin_max_attempts') THEN
      UPDATE woor.credentials SET failed_attempts = 0, locked_until = now() + woor.secs(woor.setting_int('pin_lock_sec'))
       WHERE id = c.id;
      PERFORM woor.log_event(NULL, u.role, u.id, 'auth.locked', jsonb_build_object('kind', c.kind));
      RETURN 'locked';
    END IF;
    UPDATE woor.credentials SET failed_attempts = failed_attempts + 1 WHERE id = c.id;
    PERFORM woor.log_event(NULL, u.role, u.id, 'auth.failed', jsonb_build_object('kind', c.kind));
    RETURN 'failed';
  END IF;
  IF u.status <> 'active' THEN
    RETURN 'account_' || u.status::text;
  END IF;
  IF c.kind = 'passkey' AND p_sign_count > 0 AND p_sign_count <= c.sign_count THEN
    PERFORM woor.log_event(NULL, u.role, u.id, 'auth.counter_regression', '{}'::jsonb);
    RETURN 'counter_regression';                  -- passkey peut-être clonée
  END IF;
  UPDATE woor.credentials
     SET failed_attempts = 0, locked_until = NULL, last_used_at = now(),
         sign_count = CASE WHEN c.kind = 'passkey' THEN greatest(c.sign_count, coalesce(p_sign_count, 0)) ELSE sign_count END
   WHERE id = c.id;
  UPDATE woor.users SET last_login_at = now() WHERE id = u.id;
  PERFORM woor.log_event(NULL, u.role, u.id, 'auth.login', jsonb_build_object('kind', c.kind));
  RETURN 'ok';
END
$$;
COMMENT ON FUNCTION woor.record_login IS 'Résultat d''une vérification faite par l''API : ok, failed, locked, unknown, counter_regression, account_<statut>.';

-- Sessions --------------------------------------------------------------
CREATE FUNCTION woor.create_session(p_user uuid, p_token_hash bytea, p_device_label text DEFAULT NULL,
                                    p_ip_prefix_hash bytea DEFAULT NULL, p_ua_hash bytea DEFAULT NULL)
RETURNS TABLE (session_id uuid, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
#variable_conflict use_column
DECLARE
  v_role  woor.app_role;
  v_exp   timestamptz;
  v_id    uuid;
BEGIN
  SELECT u.role INTO v_role FROM woor.users u WHERE u.id = p_user AND u.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_inactive' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM woor.credentials c WHERE c.user_id = p_user AND c.last_used_at > now() - interval '2 minutes') THEN
    RAISE EXCEPTION 'no_recent_login: authentification requise avant d''ouvrir une session' USING ERRCODE = '42501';
  END IF;
  v_exp := now() + CASE WHEN v_role IN ('arbiter', 'admin') THEN woor.secs(woor.setting_int('staff_session_idle_sec'))
                        ELSE woor.secs(woor.setting_int('session_ttl_sec')) END;
  INSERT INTO woor.sessions (user_id, token_hash, device_label, ip_prefix_hash, ua_hash, expires_at, reauth_at)
  VALUES (p_user, p_token_hash, left(p_device_label, 60), p_ip_prefix_hash, p_ua_hash, v_exp, now())
  RETURNING id INTO v_id;
  PERFORM woor.log_event(NULL, v_role, p_user, 'session.created');
  RETURN QUERY SELECT v_id, v_exp;
END
$$;

CREATE FUNCTION woor.session_lookup(p_token_hash bytea)
RETURNS TABLE (session_id uuid, user_id uuid, role woor.app_role, expires_at timestamptz, reauth_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
#variable_conflict use_column
DECLARE
  s       woor.sessions%ROWTYPE;
  v_role  woor.app_role;
  v_exp   timestamptz;
BEGIN
  SELECT * INTO s FROM woor.sessions
   WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN
    RETURN;
  END IF;
  SELECT u.role INTO v_role FROM woor.users u WHERE u.id = s.user_id AND u.status = 'active';
  IF NOT FOUND THEN
    RETURN;
  END IF;
  v_exp := s.expires_at;
  IF v_role IN ('arbiter', 'admin') THEN          -- 15 min glissantes, 12 h au plus
    v_exp := least(now() + woor.secs(woor.setting_int('staff_session_idle_sec')), s.created_at + interval '12 hours');
  END IF;
  IF v_exp <> s.expires_at OR s.last_seen_at IS NULL OR s.last_seen_at < now() - interval '1 minute' THEN
    UPDATE woor.sessions SET last_seen_at = now(), expires_at = v_exp WHERE id = s.id;
  END IF;
  RETURN QUERY SELECT s.id, s.user_id, v_role, v_exp, s.reauth_at;
END
$$;
COMMENT ON FUNCTION woor.session_lookup IS 'Valide le cookie de session à chaque requête ; rien en retour = non connecté.';

CREATE FUNCTION woor.mark_reauth(p_session uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  UPDATE woor.sessions s SET reauth_at = now()
   WHERE s.id = p_session AND s.user_id = woor.ctx_user() AND s.revoked_at IS NULL AND s.expires_at > now()
     AND EXISTS (SELECT 1 FROM woor.credentials c
                  WHERE c.user_id = s.user_id AND c.kind = 'passkey' AND c.last_used_at > now() - interval '2 minutes');
  IF FOUND THEN
    PERFORM woor.log_event(NULL, woor.ctx_role(), woor.ctx_user(), 'session.reauth');
  END IF;
  RETURN FOUND;
END
$$;

CREATE FUNCTION woor.revoke_session(p_session uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_admin boolean := woor.active_staff(woor.ctx_user(), ARRAY['admin']::woor.app_role[]) IS NOT NULL;
BEGIN
  UPDATE woor.sessions
     SET revoked_at = now(), revoked_reason = CASE WHEN user_id = woor.ctx_user() THEN 'logout' ELSE 'admin' END
   WHERE id = p_session AND revoked_at IS NULL AND (user_id = woor.ctx_user() OR v_admin);
  IF FOUND THEN
    PERFORM woor.log_event(NULL, woor.ctx_role(), woor.ctx_user(), 'session.revoked');
  END IF;
  RETURN FOUND;
END
$$;

-- Administration des comptes --------------------------------------------
CREATE FUNCTION woor.set_user_status(p_target uuid, p_status woor.user_status, p_reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_actor  uuid := woor.ctx_user();
  v_role   woor.app_role := woor.active_staff(v_actor, ARRAY['arbiter', 'admin']::woor.app_role[]);
  t        woor.users%ROWTYPE;
BEGIN
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.assert_reauth();
  SELECT * INTO t FROM woor.users WHERE id = p_target FOR UPDATE;
  IF NOT FOUND OR t.id = v_actor OR p_status = 'invited' OR t.status = 'closed'
     OR (v_role = 'arbiter' AND (p_status <> 'suspended' OR t.role IN ('arbiter', 'admin'))) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF p_status = 'suspended' AND char_length(coalesce(p_reason, '')) < 5 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '23514';
  END IF;
  UPDATE woor.users
     SET status = p_status,
         suspended_reason = CASE WHEN p_status = 'suspended' THEN left(p_reason, 300) END,
         closed_at    = CASE WHEN p_status = 'closed' THEN now() ELSE closed_at END,
         phone_enc    = CASE WHEN p_status = 'closed' THEN NULL ELSE phone_enc END,
         phone_key_id = CASE WHEN p_status = 'closed' THEN NULL ELSE phone_key_id END,
         phone_hmac   = CASE WHEN p_status = 'closed' THEN NULL ELSE phone_hmac END,
         phone_last2  = CASE WHEN p_status = 'closed' THEN NULL ELSE phone_last2 END
   WHERE id = p_target;
  IF p_status IN ('suspended', 'closed') THEN
    UPDATE woor.sessions SET revoked_at = now(), revoked_reason = 'suspended' WHERE user_id = p_target AND revoked_at IS NULL;
    UPDATE woor.push_subscriptions SET revoked_at = now() WHERE user_id = p_target AND revoked_at IS NULL;
  END IF;
  IF p_status = 'closed' THEN
    DELETE FROM woor.credentials WHERE user_id = p_target;
  END IF;
  PERFORM woor.log_event(NULL, v_role, v_actor, 'account.status',
                         jsonb_build_object('user_id', p_target, 'from', t.status, 'to', p_status));
END
$$;
COMMENT ON FUNCTION woor.set_user_status IS 'Arbitre : suspendre une vendeuse ou un livreur. Administrateur : tout changement. La clôture efface le numéro.';

CREATE FUNCTION woor.verify_identity(p_target uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_actor uuid := woor.ctx_user();
BEGIN
  IF woor.active_staff(v_actor, ARRAY['admin']::woor.app_role[]) IS NULL OR v_actor = p_target THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.assert_reauth();
  UPDATE woor.users SET identity_checked_at = now(), identity_checked_by = v_actor
   WHERE id = p_target AND role IN ('seller', 'courier') AND status IN ('invited', 'active');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM woor.log_event(NULL, 'admin', v_actor, 'account.identity_checked', jsonb_build_object('user_id', p_target));
END
$$;

CREATE FUNCTION woor.link_courier(p_seller uuid, p_courier uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF woor.active_staff(woor.ctx_user(), ARRAY['admin']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO woor.seller_couriers (seller_id, courier_id, created_by) VALUES (p_seller, p_courier, woor.ctx_user())
  ON CONFLICT DO NOTHING;
  PERFORM woor.log_event(NULL, 'admin', woor.ctx_user(), 'courier.linked',
                         jsonb_build_object('seller_id', p_seller, 'courier_id', p_courier));
END
$$;

CREATE FUNCTION woor.unlink_courier(p_seller uuid, p_courier uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF NOT (woor.ctx_user() = p_seller AND woor.ctx_role() = 'seller')
     AND woor.active_staff(woor.ctx_user(), ARRAY['admin']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  DELETE FROM woor.seller_couriers WHERE seller_id = p_seller AND courier_id = p_courier;
  IF FOUND THEN
    PERFORM woor.log_event(NULL, woor.ctx_role(), woor.ctx_user(), 'courier.unlinked',
                           jsonb_build_object('seller_id', p_seller, 'courier_id', p_courier));
  END IF;
  RETURN FOUND;
END
$$;

-- ---------------------------------------------------------------------
-- 16. Machine à états des commandes
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.can_see_order(p_seller uuid, p_courier uuid, p_order uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT CASE woor.ctx_role()
           WHEN 'arbiter' THEN true
           WHEN 'admin'   THEN true
           WHEN 'seller'  THEN p_seller = woor.ctx_user()
           WHEN 'courier' THEN p_courier = woor.ctx_user()
           WHEN 'buyer'   THEN p_order = woor.ctx_buyer_order()
           ELSE false
         END
$$;
COMMENT ON FUNCTION woor.can_see_order IS 'Règle de visibilité d''une commande, utilisée par les politiques RLS.';

CREATE FUNCTION woor.apply_order_event(p_order uuid, p_event text, p_role woor.app_role,
                                       p_user uuid DEFAULT NULL, p_data jsonb DEFAULT '{}'::jsonb)
RETURNS woor.order_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_order    woor.orders%ROWTYPE;
  v_to       woor.order_state;
  v_allowed  woor.app_role[];
  v_final    boolean;
BEGIN
  SELECT * INTO v_order FROM woor.orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT t.to_state, t.allowed_roles INTO v_to, v_allowed
    FROM woor.order_transitions t WHERE t.from_state = v_order.state AND t.event = p_event;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'transition_refused: « % » impossible depuis « % »', p_event, v_order.state USING ERRCODE = 'P0001';
  END IF;
  IF NOT (p_role = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'role_refused: % ne peut pas déclencher « % »', p_role, p_event USING ERRCODE = '42501';
  END IF;
  IF p_role = 'seller' AND v_order.seller_id IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'not_your_order' USING ERRCODE = '42501';
  ELSIF p_role = 'courier' AND v_order.courier_id IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'not_your_delivery' USING ERRCODE = '42501';
  ELSIF p_role = 'buyer' AND woor.ctx_buyer_order() IS DISTINCT FROM p_order THEN
    RAISE EXCEPTION 'not_your_device' USING ERRCODE = '42501';
  ELSIF p_role = 'arbiter' AND woor.active_staff(p_user, ARRAY['arbiter']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'arbiter_required' USING ERRCODE = '42501';
  END IF;

  v_final := v_to IN ('paid_out', 'courier_paid', 'refunded', 'expired');

  UPDATE woor.orders SET
    state               = v_to,
    state_version       = state_version + 1,
    locked_at           = CASE WHEN v_to = 'locked' THEN now() ELSE locked_at END,
    pickup_deadline     = CASE WHEN v_to = 'locked' THEN now() + woor.secs(woor.setting_int('pickup_window_sec'))
                               ELSE pickup_deadline END,
    hard_stop_at        = CASE WHEN v_to = 'locked'
                               THEN least(coalesce(hard_stop_at, 'infinity'::timestamptz),
                                          now() + woor.secs(woor.setting_int('hard_stop_sec')))
                               ELSE hard_stop_at END,
    picked_up_at        = CASE WHEN p_event = 'pickup_confirmed' THEN now() ELSE picked_up_at END,
    delivered_at        = CASE WHEN v_to = 'delivered' THEN now() ELSE delivered_at END,
    closed_at           = CASE WHEN v_final THEN now() ELSE closed_at END,
    purge_after         = CASE WHEN v_final THEN now() + make_interval(days => woor.setting_int('pii_retention_days')::integer)
                               ELSE purge_after END,
    cancelled_by_role   = CASE WHEN p_event = 'cancel' THEN p_role ELSE cancelled_by_role END,
    cancel_reason       = CASE WHEN p_event = 'cancel' THEN left(p_data ->> 'reason', 200) ELSE cancel_reason END,
    refusal_declared_at = CASE WHEN p_event = 'decide_resume' THEN NULL ELSE refusal_declared_at END,
    no_show_declared_at = CASE WHEN p_event = 'decide_resume' THEN NULL ELSE no_show_declared_at END,
    contest_deadline    = CASE WHEN p_event = 'decide_resume' THEN NULL ELSE contest_deadline END
  WHERE id = p_order;

  IF p_event IN ('hard_stop', 'dispute_timeout') THEN
    UPDATE woor.disputes SET state = 'defaulted', defaulted_at = now()
     WHERE order_id = p_order AND state = 'open' AND NOT post_delivery;
  END IF;

  PERFORM woor.log_event(p_order, p_role, p_user, 'order.' || p_event,
                         jsonb_build_object('from', v_order.state, 'to', v_to) || (coalesce(p_data, '{}'::jsonb) - 'reason'));

  -- Effets à exécuter par le service de paiements, écrits dans la même transaction.
  -- Règlement : article (B) puis course (A).
  IF v_to = 'delivered' THEN
    INSERT INTO woor.outbox (topic, order_id, payload) VALUES
      ('invoice.settle', p_order, '{"kind": "item"}'),
      ('invoice.settle', p_order, '{"kind": "delivery_fee"}');
  ELSIF v_to = 'courier_paid' THEN
    INSERT INTO woor.outbox (topic, order_id, payload) VALUES
      ('invoice.cancel', p_order, '{"kind": "item"}'),
      ('invoice.settle', p_order, '{"kind": "delivery_fee"}');
  ELSIF v_to = 'refunded' AND v_order.state = 'delivered' THEN
    INSERT INTO woor.outbox (topic, order_id, payload) VALUES ('payout.run', p_order, '{"kind": "buyer_refund"}');
  ELSIF v_to IN ('refunded', 'expired') THEN
    INSERT INTO woor.outbox (topic, order_id, payload) VALUES
      ('invoice.cancel', p_order, '{"kind": "item"}'),
      ('invoice.cancel', p_order, '{"kind": "delivery_fee"}');
  END IF;
  INSERT INTO woor.outbox (topic, order_id, payload)
  VALUES ('notify.order_' || v_to::text, p_order, jsonb_build_object('event', p_event));

  RETURN v_to;
END
$$;
COMMENT ON FUNCTION woor.apply_order_event IS 'Seul chemin pour changer l''état d''une commande : vérifie transition, rôle et personne, journalise, planifie les effets. Réservée au service de paiements et aux fonctions internes.';

CREATE FUNCTION woor.fire_due_timers() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  r    record;
  v_n  integer := 0;
BEGIN
  FOR r IN SELECT * FROM woor.v_due_timers LOOP
    BEGIN
      PERFORM 1 FROM woor.orders WHERE id = r.order_id FOR UPDATE;
      -- Revérifié sous verrou : l'état a pu changer depuis la lecture de la vue.
      IF EXISTS (SELECT 1 FROM woor.v_due_timers t WHERE t.order_id = r.order_id AND t.due_event = r.due_event) THEN
        PERFORM woor.apply_order_event(r.order_id, r.due_event, 'system', NULL, '{"timer": true}'::jsonb);
        v_n := v_n + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      PERFORM woor.log_event(r.order_id, 'system', NULL, 'timer.failed',
                             jsonb_build_object('event', r.due_event, 'error', left(SQLERRM, 200)));
    END;
  END LOOP;
  RETURN v_n;
END
$$;
COMMENT ON FUNCTION woor.fire_due_timers IS 'Tâche timer.fire, chaque minute : applique les échéances dues (paiement, ramassage, contestation, arbitrage, arrêt final).';

-- ---------------------------------------------------------------------
-- 17. Acheteur (appareil lié, sans compte)
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.public_order_summary(p_token_hash bytea)
RETURNS TABLE (seller_name text, seller_successful_deliveries bigint, item_label text, item_price_xof integer,
               delivery_fee_xof integer, total_xof integer, state woor.order_state, claimed boolean,
               courier_first_name text, courier_phone_last2 char(2))
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
  SELECT s.display_name, r.successful_deliveries, o.item_label, o.item_price_xof, o.delivery_fee_xof, o.total_xof,
         o.state, o.buyer_device_hash IS NOT NULL,
         CASE WHEN o.state IN ('locked', 'in_transit', 'disputed') THEN split_part(c.display_name, ' ', 1) END,
         CASE WHEN o.state IN ('in_transit', 'disputed') THEN c.phone_last2 END
  FROM woor.orders o
  JOIN woor.users s ON s.id = o.seller_id
  JOIN woor.users c ON c.id = o.courier_id
  JOIN woor.v_seller_reputation r ON r.seller_id = o.seller_id
  WHERE o.public_token_hash = p_token_hash
$$;
COMMENT ON FUNCTION woor.public_order_summary IS 'GET /v1/o/:jeton : ni adresse, ni téléphone, ni code, ni identifiant interne. Lecture seule (aperçus de lien).';

CREATE FUNCTION woor.claim_order(p_token_hash bytea, p_device_hash bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE;
BEGIN
  IF octet_length(p_device_hash) IS DISTINCT FROM 32 THEN
    RAISE EXCEPTION 'invalid_device' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v FROM woor.orders WHERE public_token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;                                   -- même réponse qu'une commande non disponible
  END IF;
  IF v.buyer_device_hash = p_device_hash THEN
    RETURN v.id;                                   -- même téléphone : idempotent
  END IF;
  IF v.buyer_device_hash IS NOT NULL THEN
    RAISE EXCEPTION 'order_claimed_elsewhere: commande déjà prise sur un autre téléphone' USING ERRCODE = 'P0001';
  END IF;
  IF v.state <> 'awaiting_payment' THEN
    RETURN NULL;
  END IF;
  IF (SELECT engaged FROM woor.kill_switch) THEN
    RAISE EXCEPTION 'service_paused' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM woor.orders
       WHERE buyer_device_hash = p_device_hash AND state IN ('awaiting_payment', 'locked', 'in_transit', 'disputed'))
     >= woor.setting_int('max_open_orders_per_device') THEN
    RAISE EXCEPTION 'too_many_open_orders: 3 commandes ouvertes au plus par téléphone' USING ERRCODE = 'P0001';
  END IF;
  UPDATE woor.orders SET buyer_device_hash = p_device_hash, claimed_at = now() WHERE id = v.id;
  PERFORM woor.log_event(v.id, 'buyer', NULL, 'order.claimed');
  RETURN v.id;
END
$$;
COMMENT ON FUNCTION woor.claim_order IS 'POST /v1/o/:jeton/claim : le premier téléphone qui appuie sur « Je commande » est lié à la commande.';

CREATE FUNCTION woor.buyer_order(p_token_hash bytea, p_device_hash bytea) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
  SELECT id FROM woor.orders WHERE public_token_hash = p_token_hash AND buyer_device_hash = p_device_hash
$$;
COMMENT ON FUNCTION woor.buyer_order IS 'Commande de l''appareil lié ; l''API pose ensuite woor.role = buyer et woor.buyer_order_id.';

CREATE FUNCTION woor.assert_buyer(p_order uuid) RETURNS void
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF woor.ctx_role() IS DISTINCT FROM 'buyer' OR woor.ctx_buyer_order() IS DISTINCT FROM p_order THEN
    RAISE EXCEPTION 'not_your_device' USING ERRCODE = '42501';
  END IF;
END
$$;

CREATE FUNCTION woor.request_invoices(p_order uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE;
BEGIN
  PERFORM woor.assert_buyer(p_order);
  SELECT * INTO v FROM woor.orders WHERE id = p_order FOR UPDATE;
  IF v.state <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'not_payable: commande « % »', v.state USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM woor.invoices WHERE order_id = p_order) THEN
    RETURN 'exists';
  END IF;
  IF EXISTS (SELECT 1 FROM woor.outbox WHERE order_id = p_order AND topic = 'invoice.create' AND processed_at IS NULL) THEN
    RETURN 'pending';
  END IF;
  PERFORM woor.assert_can_lock(v.total_xof);
  INSERT INTO woor.outbox (topic, order_id) VALUES ('invoice.create', p_order);
  PERFORM woor.log_event(p_order, 'buyer', NULL, 'invoice.requested');
  RETURN 'requested';
END
$$;
COMMENT ON FUNCTION woor.request_invoices IS 'POST /v1/o/:jeton/invoices : idempotent ; le service de paiements crée la paire A + B.';

CREATE FUNCTION woor.issue_delivery_code(p_order uuid, p_device_hash bytea, p_code_hmac bytea) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE;
BEGIN
  PERFORM woor.assert_buyer(p_order);
  SELECT * INTO v FROM woor.orders WHERE id = p_order FOR UPDATE;
  IF v.buyer_device_hash IS DISTINCT FROM p_device_hash OR v.state NOT IN ('locked', 'in_transit')
     OR v.delivery_code_hmac IS NOT NULL OR octet_length(p_code_hmac) IS DISTINCT FROM 32 THEN
    RETURN false;                                   -- une seule fois, à l'appareil lié, quand tout est bloqué
  END IF;
  UPDATE woor.orders SET delivery_code_hmac = p_code_hmac, code_issued_at = now() WHERE id = p_order;
  PERFORM woor.log_event(p_order, 'buyer', NULL, 'code.issued');
  RETURN true;
END
$$;
COMMENT ON FUNCTION woor.issue_delivery_code IS 'GET /v1/o/:jeton/events : l''API tire 6 chiffres, enregistre leur HMAC ici, et ne montre le code que si true.';

CREATE FUNCTION woor.set_buyer_phone(p_order uuid, p_phone_enc bytea, p_key_id smallint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  PERFORM woor.assert_buyer(p_order);
  UPDATE woor.orders SET buyer_phone_enc = p_phone_enc, buyer_phone_key_id = p_key_id
   WHERE id = p_order AND state IN ('awaiting_payment', 'locked', 'in_transit');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.log_event(p_order, 'buyer', NULL, 'buyer.phone_set');
END
$$;

CREATE FUNCTION woor.buyer_confirm_refusal(p_order uuid) RETURNS woor.order_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  PERFORM woor.assert_buyer(p_order);
  IF NOT EXISTS (SELECT 1 FROM woor.orders WHERE id = p_order AND refusal_declared_at IS NOT NULL) THEN
    RAISE EXCEPTION 'no_refusal_declared' USING ERRCODE = 'P0001';
  END IF;
  RETURN woor.apply_order_event(p_order, 'refusal_confirmed', 'buyer');
END
$$;

-- ---------------------------------------------------------------------
-- 18. Vendeuse
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.cancel_order(p_order uuid, p_reason text DEFAULT NULL) RETURNS woor.order_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF woor.ctx_role() = 'buyer' THEN
    PERFORM woor.assert_buyer(p_order);
    RETURN woor.apply_order_event(p_order, 'cancel', 'buyer', NULL, jsonb_build_object('reason', p_reason));
  ELSIF woor.ctx_role() = 'seller' THEN
    RETURN woor.apply_order_event(p_order, 'cancel', 'seller', woor.ctx_user(), jsonb_build_object('reason', p_reason));
  END IF;
  RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
END
$$;
COMMENT ON FUNCTION woor.cancel_order IS 'Vendeuse ou acheteur avant le ramassage ; après le ramassage, l''acheteur seul, et il paie la course.';

CREATE FUNCTION woor.reassign_courier(p_order uuid, p_courier uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF woor.ctx_role() IS DISTINCT FROM 'seller' THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE woor.orders SET courier_id = p_courier WHERE id = p_order AND seller_id = woor.ctx_user();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_your_order' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.log_event(p_order, 'seller', woor.ctx_user(), 'order.courier_changed', jsonb_build_object('courier_id', p_courier));
END
$$;

-- ---------------------------------------------------------------------
-- 19. Livreur
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.courier_order(p_order uuid, p_states woor.order_state[]) RETURNS woor.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  v woor.orders%ROWTYPE;
BEGIN
  SELECT * INTO v FROM woor.orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND OR woor.ctx_role() IS DISTINCT FROM 'courier' OR v.courier_id IS DISTINCT FROM woor.ctx_user() THEN
    RAISE EXCEPTION 'not_your_delivery' USING ERRCODE = '42501';
  END IF;
  IF NOT (v.state = ANY (p_states)) THEN
    RAISE EXCEPTION 'wrong_state: commande « % »', v.state USING ERRCODE = 'P0001';
  END IF;
  RETURN v;
END
$$;

CREATE FUNCTION woor.confirm_pickup(p_order uuid) RETURNS woor.order_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  PERFORM woor.courier_order(p_order, ARRAY['locked']::woor.order_state[]);
  RETURN woor.apply_order_event(p_order, 'pickup_confirmed', 'courier', woor.ctx_user());
END
$$;
COMMENT ON FUNCTION woor.confirm_pickup IS 'POST /v1/orders/:id/pickup, après vérification par l''API du QR signé (commande, nonce, 4 h, livreur choisi).';

CREATE FUNCTION woor.courier_arrived(p_order uuid, p_geohash6 text, p_accuracy_m integer DEFAULT NULL) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE := woor.courier_order(p_order, ARRAY['in_transit']::woor.order_state[]);
BEGIN
  IF v.arrived_at IS NOT NULL THEN
    RETURN v.arrived_at;
  END IF;
  UPDATE woor.orders SET arrived_at = now() WHERE id = p_order;
  INSERT INTO woor.location_proofs (order_id, courier_id, event, geohash6, accuracy_m)
  VALUES (p_order, v.courier_id, 'arrived', p_geohash6, p_accuracy_m);
  INSERT INTO woor.outbox (topic, order_id) VALUES ('notify.courier_arrived', p_order);
  PERFORM woor.log_event(p_order, 'courier', v.courier_id, 'delivery.arrived');
  RETURN now();
END
$$;

CREATE FUNCTION woor.log_call_attempt(p_order uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE := woor.courier_order(p_order, ARRAY['in_transit']::woor.order_state[]);
BEGIN
  PERFORM woor.log_event(p_order, 'courier', v.courier_id, 'delivery.call_attempt');
  RETURN (SELECT count(*)::integer FROM audit.events
           WHERE order_id = p_order AND action = 'delivery.call_attempt');
END
$$;
COMMENT ON FUNCTION woor.log_call_attempt IS 'Appui sur « Appeler l''acheteur » ; deux appels sont exigés avant de déclarer une absence.';

CREATE FUNCTION woor.declare_refusal(p_order uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE := woor.courier_order(p_order, ARRAY['in_transit']::woor.order_state[]);
  v_deadline timestamptz := now() + woor.secs(woor.setting_int('contest_window_sec'));
BEGIN
  IF v.arrived_at IS NULL OR v.refusal_declared_at IS NOT NULL OR v.no_show_declared_at IS NOT NULL THEN
    RAISE EXCEPTION 'declaration_refused: arrivée non signalée ou déclaration déjà faite' USING ERRCODE = 'P0001';
  END IF;
  UPDATE woor.orders SET refusal_declared_at = now(), contest_deadline = v_deadline WHERE id = p_order;
  INSERT INTO woor.outbox (topic, order_id, payload)
  VALUES ('notify.refusal_declared', p_order, jsonb_build_object('contest_deadline', v_deadline));
  PERFORM woor.log_event(p_order, 'courier', v.courier_id, 'delivery.refusal_declared');
  RETURN v_deadline;
END
$$;
COMMENT ON FUNCTION woor.declare_refusal IS 'POST /v1/orders/:id/refusal : l''acheteur confirme ou conteste dans les 10 min ; sans réponse, la course est payée.';

CREATE FUNCTION woor.declare_no_show(p_order uuid, p_geohash6 text, p_accuracy_m integer DEFAULT NULL) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE := woor.courier_order(p_order, ARRAY['in_transit']::woor.order_state[]);
  v_deadline timestamptz := now() + woor.secs(woor.setting_int('contest_window_sec'));
  v_calls integer;
BEGIN
  IF v.refusal_declared_at IS NOT NULL OR v.no_show_declared_at IS NOT NULL THEN
    RAISE EXCEPTION 'declaration_refused: déclaration déjà faite' USING ERRCODE = 'P0001';
  END IF;
  IF v.arrived_at IS NULL OR v.arrived_at > now() - woor.secs(woor.setting_int('wait_on_site_sec')) THEN
    RAISE EXCEPTION 'wait_required: 15 min d''attente sur place avant de déclarer une absence' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_calls FROM audit.events
   WHERE order_id = p_order AND action = 'delivery.call_attempt' AND occurred_at >= v.arrived_at - interval '30 minutes';
  IF v_calls < woor.setting_int('no_show_min_calls') THEN
    RAISE EXCEPTION 'calls_required: appeler l''acheteur deux fois avant de déclarer une absence' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO woor.location_proofs (order_id, courier_id, event, geohash6, accuracy_m)
  VALUES (p_order, v.courier_id, 'no_show', p_geohash6, p_accuracy_m);
  UPDATE woor.orders SET no_show_declared_at = now(), contest_deadline = v_deadline WHERE id = p_order;
  INSERT INTO woor.outbox (topic, order_id, payload)
  VALUES ('notify.no_show_declared', p_order, jsonb_build_object('contest_deadline', v_deadline));
  PERFORM woor.log_event(p_order, 'courier', v.courier_id, 'delivery.no_show_declared', jsonb_build_object('calls', v_calls));
  RETURN v_deadline;
END
$$;
COMMENT ON FUNCTION woor.declare_no_show IS 'POST /v1/orders/:id/no-show : 15 min sur place, 2 appels, position approximative ; contestation possible 10 min.';

CREATE FUNCTION woor.verify_delivery_code(p_order uuid, p_code_hmac bytea) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v      woor.orders%ROWTYPE;
  v_max  integer := woor.setting_int('code_max_attempts');
BEGIN
  SELECT * INTO v FROM woor.orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND OR woor.ctx_role() IS DISTINCT FROM 'courier' OR v.courier_id IS DISTINCT FROM woor.ctx_user() THEN
    RETURN 'not_allowed';
  END IF;
  IF v.code_locked_at IS NOT NULL THEN
    RETURN 'locked';
  END IF;
  IF v.state <> 'in_transit' OR v.delivery_code_hmac IS NULL THEN
    RETURN 'not_allowed';
  END IF;
  IF v.delivery_code_hmac = p_code_hmac THEN
    PERFORM woor.apply_order_event(p_order, 'code_valid', 'courier', v.courier_id);
    RETURN 'ok';
  END IF;
  UPDATE woor.orders SET code_attempts = code_attempts + 1 WHERE id = p_order;
  PERFORM woor.log_event(p_order, 'courier', v.courier_id, 'code.wrong', jsonb_build_object('attempt', v.code_attempts + 1));
  IF v.code_attempts + 1 >= v_max THEN
    UPDATE woor.orders SET code_locked_at = now() WHERE id = p_order;
    PERFORM woor.open_dispute_internal(p_order, 'system', NULL, 'code_locked',
                                       format('Verrouillage après %s codes faux', v_max));
    RETURN 'locked';
  END IF;
  RETURN 'wrong';
END
$$;
COMMENT ON FUNCTION woor.verify_delivery_code IS 'POST /v1/orders/:id/deliver. Renvoie ok, wrong, locked ou not_allowed. Transaction validée même si le code est faux.';

CREATE FUNCTION woor.buyer_contact(p_order uuid) RETURNS TABLE (phone_enc bytea, key_id smallint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v woor.orders%ROWTYPE;
BEGIN
  SELECT * INTO v FROM woor.orders WHERE id = p_order;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF (woor.ctx_role() = 'courier' AND v.courier_id = woor.ctx_user() AND v.state IN ('in_transit', 'disputed'))
     OR (woor.active_staff(woor.ctx_user(), ARRAY['arbiter']::woor.app_role[]) IS NOT NULL
         AND EXISTS (SELECT 1 FROM woor.disputes d WHERE d.order_id = p_order AND d.state = 'open')) THEN
    PERFORM woor.log_event(p_order, woor.ctx_role(), woor.ctx_user(), 'buyer_contact.read');
    RETURN QUERY SELECT v.buyer_phone_enc, v.buyer_phone_key_id;
  END IF;
END
$$;
COMMENT ON FUNCTION woor.buyer_contact IS 'Téléphone chiffré de l''acheteur : livreur assigné pendant la course, arbitre sur un litige ouvert. Chaque lecture est journalisée.';

-- ---------------------------------------------------------------------
-- 20. Litiges et signalements
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.open_dispute_internal(p_order uuid, p_role woor.app_role, p_user uuid, p_reason woor.dispute_reason,
                                           p_description text DEFAULT NULL, p_refund_destination text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v           woor.orders%ROWTYPE;
  v_id        uuid;
  v_post      boolean := false;
  v_deadline  timestamptz;
BEGIN
  SELECT * INTO v FROM woor.orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF (p_role = 'seller' AND v.seller_id IS DISTINCT FROM p_user)
     OR (p_role = 'courier' AND v.courier_id IS DISTINCT FROM p_user)
     OR (p_role = 'buyer' AND woor.ctx_buyer_order() IS DISTINCT FROM p_order)
     OR (p_role = 'arbiter' AND woor.active_staff(p_user, ARRAY['arbiter']::woor.app_role[]) IS NULL)
     OR p_role = 'admin' THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  IF v.state = 'delivered' THEN
    -- Signalement après remise, seulement pendant le versement différé.
    IF p_role <> 'buyer' OR p_reason NOT IN ('not_received', 'not_me')
       OR NOT EXISTS (SELECT 1 FROM woor.payouts p WHERE p.order_id = p_order AND p.kind = 'seller'
                       AND p.state IN ('scheduled', 'held') AND p.release_at > now()) THEN
      RAISE EXCEPTION 'report_window_closed' USING ERRCODE = 'P0001';
    END IF;
    v_post := true;
  ELSIF v.state NOT IN ('locked', 'in_transit', 'disputed') THEN
    RAISE EXCEPTION 'dispute_refused: commande « % »', v.state USING ERRCODE = 'P0001';
  ELSIF p_reason IN ('refusal_contested', 'no_show_contested')
        AND (v.contest_deadline IS NULL OR v.contest_deadline < now()) THEN
    RAISE EXCEPTION 'contest_window_closed' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_id FROM woor.disputes WHERE order_id = p_order AND state = 'open';
  IF FOUND THEN
    RETURN v_id;                                   -- un seul litige ouvert par commande
  END IF;

  v_deadline := now() + woor.secs(woor.setting_int('dispute_decision_sec'));
  IF NOT v_post THEN
    v_deadline := least(v_deadline, coalesce(v.hard_stop_at, 'infinity'::timestamptz) - interval '1 hour');
  END IF;
  INSERT INTO woor.disputes (order_id, opened_by_role, opened_by_user, reason, description, post_delivery,
                             refund_destination, decide_before)
  VALUES (p_order, p_role, p_user, p_reason, left(p_description, 500), v_post, p_refund_destination, v_deadline)
  RETURNING id INTO v_id;

  IF v.state = 'in_transit' THEN
    PERFORM woor.apply_order_event(p_order, 'dispute_opened', p_role, p_user, jsonb_build_object('dispute_id', v_id));
  END IF;
  IF v_post THEN
    UPDATE woor.payouts SET state = 'held'
     WHERE order_id = p_order AND kind IN ('seller', 'courier') AND state IN ('scheduled', 'pending', 'failed', 'needs_attention');
  END IF;
  INSERT INTO woor.outbox (topic, order_id, payload)
  VALUES ('notify.dispute_opened', p_order, jsonb_build_object('dispute_id', v_id, 'reason', p_reason));
  PERFORM woor.log_event(p_order, p_role, p_user, 'dispute.opened',
                         jsonb_build_object('dispute_id', v_id, 'reason', p_reason, 'post_delivery', v_post));
  RETURN v_id;
END
$$;

CREATE FUNCTION woor.open_dispute(p_order uuid, p_reason woor.dispute_reason, p_description text DEFAULT NULL,
                                  p_refund_destination text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF woor.ctx_role() NOT IN ('buyer', 'seller', 'courier', 'arbiter') OR p_reason = 'code_locked' THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN woor.open_dispute_internal(p_order, woor.ctx_role(),
                                    CASE WHEN woor.ctx_role() = 'buyer' THEN NULL ELSE woor.ctx_user() END,
                                    p_reason, p_description, p_refund_destination);
END
$$;
COMMENT ON FUNCTION woor.open_dispute IS 'POST /v1/o/:jeton/contest (acheteur), litige du livreur ou de la vendeuse, ouverture par l''arbitre (code perdu).';

CREATE FUNCTION woor.decide_dispute(p_dispute uuid, p_decision woor.dispute_decision, p_justification text,
                                    p_new_code_hmac bytea DEFAULT NULL, p_compensate_courier boolean DEFAULT false,
                                    p_strike_user uuid DEFAULT NULL) RETURNS woor.order_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_arbiter  uuid := woor.ctx_user();
  d          woor.disputes%ROWTYPE;
  v          woor.orders%ROWTYPE;
  v_state    woor.order_state;
  v_item     woor.invoices%ROWTYPE;
  v_fee      woor.invoices%ROWTYPE;
  v_dest     text;
BEGIN
  IF woor.active_staff(v_arbiter, ARRAY['arbiter']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'arbiter_required' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.assert_reauth();
  IF char_length(coalesce(p_justification, '')) < 10 THEN
    RAISE EXCEPTION 'justification_required: au moins 10 caractères' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO d FROM woor.disputes WHERE id = p_dispute FOR UPDATE;
  IF NOT FOUND OR d.state <> 'open' THEN
    RAISE EXCEPTION 'dispute_not_open' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v FROM woor.orders WHERE id = d.order_id FOR UPDATE;
  SELECT * INTO v_item FROM woor.invoices WHERE order_id = v.id AND kind = 'item';
  SELECT * INTO v_fee  FROM woor.invoices WHERE order_id = v.id AND kind = 'delivery_fee';
  IF d.post_delivery <> (p_decision IN ('release_payouts', 'refund_buyer')) THEN
    RAISE EXCEPTION 'decision_not_applicable' USING ERRCODE = '23514';
  END IF;
  IF p_compensate_courier AND (p_decision <> 'cancel_both' OR v.picked_up_at IS NULL) THEN
    RAISE EXCEPTION 'compensation_not_applicable: seulement si tout est annulé après ramassage' USING ERRCODE = '23514';
  END IF;

  UPDATE woor.disputes
     SET state = 'decided', decision = p_decision, decided_by = v_arbiter, decided_at = now(),
         justification = p_justification, courier_compensated = p_compensate_courier
   WHERE id = p_dispute;

  CASE p_decision
    WHEN 'release_payouts' THEN
      UPDATE woor.payouts SET state = CASE WHEN destination IS NULL THEN 'needs_attention'::woor.payout_state
                                           ELSE 'pending'::woor.payout_state END,
                              release_at = now()
       WHERE order_id = v.id AND state = 'held';
      v_state := v.state;
    WHEN 'refund_buyer' THEN
      UPDATE woor.payouts SET state = 'cancelled', cancelled_at = now()
       WHERE order_id = v.id AND kind IN ('seller', 'courier') AND state <> 'cancelled';
      v_state := woor.apply_order_event(v.id, 'decide_refund_buyer', 'arbiter', v_arbiter,
                                        jsonb_build_object('dispute_id', p_dispute));
      INSERT INTO woor.payouts (order_id, dispute_id, beneficiary_id, kind, amount_msat, amount_xof, max_fee_msat,
                                destination, state)
      VALUES (v.id, p_dispute, NULL, 'buyer_refund', v_item.amount_msat + v_fee.amount_msat, v.total_xof,
              (v_item.amount_msat + v_fee.amount_msat) * woor.setting_int('routing_fee_max_ppm') / 1000000,
              d.refund_destination,
              CASE WHEN d.refund_destination IS NULL THEN 'needs_attention'::woor.payout_state
                   ELSE 'pending'::woor.payout_state END);
    WHEN 'reissue_code' THEN
      IF octet_length(p_new_code_hmac) IS DISTINCT FROM 32 OR v.code_reissues >= 3
         OR v.state NOT IN ('locked', 'in_transit', 'disputed') THEN
        RAISE EXCEPTION 'reissue_refused' USING ERRCODE = '23514';
      END IF;
      UPDATE woor.orders
         SET delivery_code_hmac = p_new_code_hmac, code_issued_at = now(), code_attempts = 0,
             code_locked_at = NULL, code_reissues = code_reissues + 1
       WHERE id = v.id;
      v_state := v.state;
      IF v.state = 'disputed' THEN
        v_state := woor.apply_order_event(v.id, 'decide_resume', 'arbiter', v_arbiter,
                                          jsonb_build_object('dispute_id', p_dispute));
      END IF;
    ELSE
      v_state := woor.apply_order_event(v.id,
                   CASE p_decision WHEN 'settle_both'            THEN 'decide_settle_both'
                                   WHEN 'settle_fee_cancel_item' THEN 'decide_fee_only'
                                   ELSE 'decide_cancel_both' END,
                   'arbiter', v_arbiter, jsonb_build_object('dispute_id', p_dispute));
      IF p_compensate_courier THEN
        SELECT payout_ln_address INTO v_dest FROM woor.users WHERE id = v.courier_id;
        INSERT INTO woor.payouts (order_id, dispute_id, beneficiary_id, kind, amount_msat, amount_xof, max_fee_msat,
                                  destination, state)
        VALUES (v.id, p_dispute, v.courier_id, 'courier_compensation', v_fee.amount_msat, v.delivery_fee_xof,
                v_fee.amount_msat * woor.setting_int('routing_fee_max_ppm') / 1000000, v_dest,
                CASE WHEN v_dest IS NULL THEN 'needs_attention'::woor.payout_state ELSE 'pending'::woor.payout_state END);
      END IF;
  END CASE;

  IF p_strike_user IS NOT NULL THEN
    IF p_strike_user NOT IN (v.seller_id, v.courier_id) THEN
      RAISE EXCEPTION 'strike_not_party' USING ERRCODE = '23514';
    END IF;
    INSERT INTO woor.strikes (user_id, order_id, reason, created_by)
    VALUES (p_strike_user, v.id, left('Litige : ' || p_justification, 300), v_arbiter);
  END IF;
  INSERT INTO woor.outbox (topic, order_id, payload)
  VALUES ('notify.dispute_decided', v.id, jsonb_build_object('dispute_id', p_dispute, 'decision', p_decision));
  PERFORM woor.log_event(v.id, 'arbiter', v_arbiter, 'dispute.decided',
                         jsonb_build_object('dispute_id', p_dispute, 'decision', p_decision,
                                            'courier_compensated', p_compensate_courier, 'strike', p_strike_user IS NOT NULL));
  RETURN v_state;
END
$$;
COMMENT ON FUNCTION woor.decide_dispute IS 'POST /v1/admin/disputes/:id/decide : arbitre actif, passkey redemandée, justification. Code perdu : l''API tire le nouveau code et le montre une fois à l''arbitre, qui le dicte à l''acheteur au téléphone.';

-- ---------------------------------------------------------------------
-- 21. Plafonds, factures, versements
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.assert_can_lock(p_amount_xof integer) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  t record;
BEGIN
  IF (SELECT engaged FROM woor.kill_switch) THEN
    RAISE EXCEPTION 'service_paused: interrupteur général activé' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO t FROM woor.v_locked_totals;
  IF t.committed_xof + p_amount_xof > woor.setting_int('max_total_locked_xof') THEN
    RAISE EXCEPTION 'cap_total_locked: plafond global atteint' USING ERRCODE = 'P0001';
  END IF;
  IF t.committed_invoices + 2 > woor.setting_int('max_concurrent_htlcs') THEN
    RAISE EXCEPTION 'cap_concurrent_htlcs: trop de paiements bloqués en même temps' USING ERRCODE = 'P0001';
  END IF;
END
$$;
COMMENT ON FUNCTION woor.assert_can_lock IS 'Avant toute paire de factures : interrupteur, plafond de 300 000 F engagés, 100 paiements au plus.';

CREATE FUNCTION woor.schedule_payouts(p_order uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v        woor.orders%ROWTYPE;
  r        woor.invoices%ROWTYPE;
  v_delay  boolean := false;
  v_ben    uuid;
  v_dest   text;
  v_n      integer := 0;
BEGIN
  SELECT * INTO v FROM woor.orders WHERE id = p_order FOR UPDATE;
  IF v.state = 'delivered' THEN
    -- Nouvelle vendeuse ou nouveau duo vendeuse-livreur : versements différés de 2 h.
    SELECT (count(*) FILTER (WHERE o.seller_id = v.seller_id) < woor.setting_int('new_seller_orders'))
        OR (count(*) FILTER (WHERE o.seller_id = v.seller_id AND o.courier_id = v.courier_id) < woor.setting_int('new_seller_orders'))
      INTO v_delay
      FROM woor.orders o
     WHERE o.seller_id = v.seller_id AND o.state IN ('delivered', 'paid_out') AND o.id <> p_order;
  ELSIF v.state <> 'courier_paid' THEN
    RETURN 0;
  END IF;

  FOR r IN SELECT * FROM woor.invoices
            WHERE order_id = p_order AND state = 'settled'
              AND (kind = 'delivery_fee' OR v.state = 'delivered') LOOP
    v_ben := CASE r.kind WHEN 'item' THEN v.seller_id ELSE v.courier_id END;
    SELECT payout_ln_address INTO v_dest FROM woor.users WHERE id = v_ben;
    INSERT INTO woor.payouts (order_id, beneficiary_id, kind, amount_msat, amount_xof, max_fee_msat, destination, state, release_at)
    VALUES (p_order, v_ben,
            CASE r.kind WHEN 'item' THEN 'seller'::woor.payout_kind ELSE 'courier'::woor.payout_kind END,
            r.amount_msat, r.amount_xof,
            r.amount_msat * woor.setting_int('routing_fee_max_ppm') / 1000000,
            v_dest,
            CASE WHEN v_delay THEN 'scheduled'::woor.payout_state
                 WHEN v_dest IS NULL THEN 'needs_attention'::woor.payout_state
                 ELSE 'pending'::woor.payout_state END,
            CASE WHEN v_delay THEN now() + woor.secs(woor.setting_int('new_seller_payout_delay_sec')) ELSE now() END)
    ON CONFLICT (order_id, kind) DO NOTHING;
    IF FOUND THEN
      v_n := v_n + 1;
    END IF;
  END LOOP;
  IF v_n > 0 THEN
    INSERT INTO woor.outbox (topic, order_id, available_at)
    VALUES ('payout.run', p_order, CASE WHEN v_delay
                                        THEN now() + woor.secs(woor.setting_int('new_seller_payout_delay_sec'))
                                        ELSE now() END);
    PERFORM woor.log_event(p_order, 'system', NULL, 'payout.scheduled', jsonb_build_object('count', v_n, 'delayed', v_delay));
  END IF;
  RETURN v_n;
END
$$;
COMMENT ON FUNCTION woor.schedule_payouts IS 'Après règlement : crée les versements (idempotent), différés pour une nouvelle vendeuse ou un nouveau duo.';

CREATE FUNCTION woor.release_due_payouts() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE woor.payouts p
     SET destination = u.payout_ln_address,
         state = CASE WHEN u.payout_ln_address IS NULL THEN 'needs_attention'::woor.payout_state
                      ELSE 'pending'::woor.payout_state END
    FROM woor.users u
   WHERE u.id = p.beneficiary_id AND p.state = 'scheduled' AND p.release_at <= now()
     AND NOT EXISTS (SELECT 1 FROM woor.disputes d WHERE d.order_id = p.order_id AND d.state = 'open');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END
$$;
COMMENT ON FUNCTION woor.release_due_payouts IS 'Chaque minute : les versements différés arrivés à échéance, sans signalement, deviennent payables.';

CREATE FUNCTION woor.trg_invoice_state_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_order  woor.orders%ROWTYPE;
  v_states woor.invoice_state[];
BEGIN
  IF NEW.state = OLD.state THEN
    RETURN NEW;
  END IF;
  PERFORM woor.log_event(NEW.order_id, 'system', NULL, 'invoice.' || NEW.state::text, jsonb_build_object('kind', NEW.kind));
  SELECT * INTO v_order FROM woor.orders WHERE id = NEW.order_id;
  SELECT array_agg(state ORDER BY kind) INTO v_states FROM woor.invoices WHERE order_id = NEW.order_id;
  IF NEW.state = 'accepted' AND v_order.state = 'awaiting_payment'
     AND v_states = ARRAY['accepted', 'accepted']::woor.invoice_state[] THEN
    PERFORM woor.apply_order_event(NEW.order_id, 'invoices_locked', 'system');   -- les deux paiements sont bloqués
  ELSIF NEW.state = 'settled' AND v_order.state IN ('delivered', 'courier_paid') THEN
    IF v_order.state = 'courier_paid' OR v_states = ARRAY['settled', 'settled']::woor.invoice_state[] THEN
      PERFORM woor.schedule_payouts(NEW.order_id);
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER invoices_state_changed AFTER UPDATE OF state ON woor.invoices
  FOR EACH ROW EXECUTE FUNCTION woor.trg_invoice_state_changed();

-- ---------------------------------------------------------------------
-- 22. Adresse de versement (délai de 24 h)
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.wake_payouts(p_user uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE woor.payouts p SET destination = u.payout_ln_address, state = 'pending'
    FROM woor.users u
   WHERE u.id = p_user AND p.beneficiary_id = u.id AND p.state = 'needs_attention' AND u.payout_ln_address IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM woor.disputes d WHERE d.order_id = p.order_id AND d.state = 'open');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END
$$;

CREATE FUNCTION woor.request_payout_address_change(p_new_address text) RETURNS woor.address_change_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_user  uuid := woor.ctx_user();
  v_role  woor.app_role := woor.active_staff(v_user, ARRAY['seller', 'courier']::woor.app_role[]);
  v_old   text;
BEGIN
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.assert_reauth();
  SELECT payout_ln_address INTO v_old FROM woor.users WHERE id = v_user FOR UPDATE;
  IF v_old IS NOT DISTINCT FROM lower(p_new_address) THEN
    RETURN 'applied';
  END IF;
  IF v_old IS NULL THEN                            -- première adresse : immédiate
    UPDATE woor.users SET payout_ln_address = lower(p_new_address), payout_address_set_at = now() WHERE id = v_user;
    INSERT INTO woor.payout_address_changes (user_id, old_address, new_address, state, effective_at, applied_at, requested_session_id)
    VALUES (v_user, NULL, lower(p_new_address), 'applied', now(), now(), woor.ctx_session());
    PERFORM woor.wake_payouts(v_user);
    PERFORM woor.log_event(NULL, v_role, v_user, 'payout_address.set');
    RETURN 'applied';
  END IF;
  IF EXISTS (SELECT 1 FROM woor.payout_address_changes
              WHERE user_id = v_user AND old_address IS NOT NULL AND requested_at > now() - interval '24 hours') THEN
    RAISE EXCEPTION 'too_many_changes: un changement par jour' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO woor.payout_address_changes (user_id, old_address, new_address, state, effective_at, requested_session_id)
  VALUES (v_user, v_old, lower(p_new_address), 'pending', now() + interval '24 hours', woor.ctx_session());
  INSERT INTO woor.outbox (topic, payload) VALUES ('notify.payout_address_change', jsonb_build_object('user_id', v_user));
  PERFORM woor.log_event(NULL, v_role, v_user, 'payout_address.requested');
  RETURN 'pending';
END
$$;
COMMENT ON FUNCTION woor.request_payout_address_change IS 'PUT /v1/me/payout, après le test en direct de l''adresse par l''API. Passkey redemandée ; changement effectif 24 h plus tard, alerte au titulaire.';

CREATE FUNCTION woor.cancel_payout_address_change(p_user uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
BEGIN
  IF woor.ctx_user() IS DISTINCT FROM p_user AND woor.active_staff(woor.ctx_user(), ARRAY['admin']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE woor.payout_address_changes SET state = 'cancelled', cancelled_at = now()
   WHERE user_id = p_user AND state = 'pending';
  IF FOUND THEN
    PERFORM woor.log_event(NULL, woor.ctx_role(), woor.ctx_user(), 'payout_address.cancelled', jsonb_build_object('user_id', p_user));
  END IF;
  RETURN FOUND;
END
$$;

CREATE FUNCTION woor.apply_due_address_changes() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  r    woor.payout_address_changes%ROWTYPE;
  v_n  integer := 0;
BEGIN
  FOR r IN SELECT * FROM woor.payout_address_changes WHERE state = 'pending' AND effective_at <= now() FOR UPDATE LOOP
    UPDATE woor.users SET payout_ln_address = r.new_address, payout_address_set_at = now() WHERE id = r.user_id;
    UPDATE woor.payout_address_changes SET state = 'applied', applied_at = now() WHERE id = r.id;
    PERFORM woor.wake_payouts(r.user_id);
    PERFORM woor.log_event(NULL, 'system', r.user_id, 'payout_address.applied');
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END
$$;

-- ---------------------------------------------------------------------
-- 23. Interrupteur général (réactivation à quatre yeux), réglages, avertissements
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.engage_kill_switch(p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_user  uuid := woor.ctx_user();
  v_role  woor.app_role;
BEGIN
  IF v_user IS NULL THEN
    v_role := 'system';                              -- service de paiements : réconciliation en écart, marge trop faible
  ELSE
    v_role := woor.active_staff(v_user, ARRAY['arbiter', 'admin']::woor.app_role[]);
    IF v_role IS NULL THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    PERFORM woor.assert_reauth();
  END IF;
  UPDATE woor.kill_switch
     SET engaged = true, engaged_at = now(), engaged_by = v_user, engaged_reason = left(p_reason, 300),
         release_requested_by = NULL, release_requested_at = NULL, released_by = NULL, released_at = NULL;
  INSERT INTO woor.outbox (topic, payload) VALUES ('notify.kill_switch', jsonb_build_object('engaged', true));
  PERFORM woor.log_event(NULL, v_role, v_user, 'kill_switch.engaged', jsonb_build_object('reason', left(p_reason, 300)));
END
$$;

CREATE FUNCTION woor.request_kill_switch_release() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_user uuid := woor.ctx_user();
BEGIN
  IF woor.active_staff(v_user, ARRAY['arbiter']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'arbiter_required' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.assert_reauth();
  UPDATE woor.kill_switch SET release_requested_by = v_user, release_requested_at = now() WHERE engaged;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_engaged' USING ERRCODE = 'P0001';
  END IF;
  PERFORM woor.log_event(NULL, 'arbiter', v_user, 'kill_switch.release_requested');
END
$$;

CREATE FUNCTION woor.approve_kill_switch_release() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_user uuid := woor.ctx_user();
  k      woor.kill_switch%ROWTYPE;
BEGIN
  IF woor.active_staff(v_user, ARRAY['arbiter']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'arbiter_required' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.assert_reauth();
  SELECT * INTO k FROM woor.kill_switch FOR UPDATE;
  IF NOT k.engaged OR k.release_requested_by IS NULL THEN
    RAISE EXCEPTION 'no_release_request' USING ERRCODE = 'P0001';
  END IF;
  IF k.release_requested_by = v_user THEN
    RAISE EXCEPTION 'four_eyes: un second arbitre doit valider' USING ERRCODE = '42501';
  END IF;
  UPDATE woor.kill_switch SET engaged = false, released_by = v_user, released_at = now();
  INSERT INTO woor.outbox (topic, payload) VALUES ('notify.kill_switch', jsonb_build_object('engaged', false));
  PERFORM woor.log_event(NULL, 'arbiter', v_user, 'kill_switch.released',
                         jsonb_build_object('requested_by', k.release_requested_by));
END
$$;

CREATE FUNCTION woor.update_setting(p_key text, p_value bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  s woor.settings%ROWTYPE;
BEGIN
  IF woor.active_staff(woor.ctx_user(), ARRAY['admin']::woor.app_role[]) IS NULL THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  PERFORM woor.assert_reauth();
  SELECT * INTO s FROM woor.settings WHERE key = p_key FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'setting_missing: %', p_key USING ERRCODE = 'P0002';
  END IF;
  IF p_value NOT BETWEEN s.min_value AND s.max_value THEN
    RAISE EXCEPTION 'setting_out_of_bounds: % doit rester entre % et %', p_key, s.min_value, s.max_value USING ERRCODE = '23514';
  END IF;
  UPDATE woor.settings SET value = p_value, updated_by = woor.ctx_user(), updated_at = now() WHERE key = p_key;
  PERFORM woor.log_event(NULL, 'admin', woor.ctx_user(), 'setting.updated',
                         jsonb_build_object('key', p_key, 'from', s.value, 'to', p_value));
END
$$;

CREATE FUNCTION woor.add_strike(p_user uuid, p_reason text, p_order uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_actor uuid := woor.ctx_user();
  v_role  woor.app_role := woor.active_staff(v_actor, ARRAY['arbiter', 'admin']::woor.app_role[]);
  v_id    uuid;
BEGIN
  IF v_role IS NULL OR NOT EXISTS (SELECT 1 FROM woor.users WHERE id = p_user AND role IN ('seller', 'courier')) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO woor.strikes (user_id, order_id, reason, created_by) VALUES (p_user, p_order, p_reason, v_actor)
  RETURNING id INTO v_id;
  PERFORM woor.log_event(p_order, v_role, v_actor, 'strike.added', jsonb_build_object('user_id', p_user));
  RETURN v_id;
END
$$;

-- ---------------------------------------------------------------------
-- 24. Conservation des données (chaque nuit)
-- ---------------------------------------------------------------------
CREATE FUNCTION woor.purge_personal_data() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, woor, audit AS $$
DECLARE
  v_days      integer := woor.setting_int('pii_retention_days');
  v_orders    integer;
  v_evidence  integer;
  v_locations integer;
  v_sessions  integer;
  v_outbox    integer;
BEGIN
  -- Les photos sont effacées du stockage par le service de paiements (tâche storage.delete).
  INSERT INTO woor.outbox (topic, order_id, payload)
  SELECT 'storage.delete', d.order_id, jsonb_build_object('key', e.storage_key)
    FROM woor.dispute_evidence e JOIN woor.disputes d ON d.id = e.dispute_id JOIN woor.orders o ON o.id = d.order_id
   WHERE o.purge_after < now() AND o.pii_purged_at IS NULL AND e.storage_key IS NOT NULL;
  DELETE FROM woor.dispute_evidence e USING woor.disputes d, woor.orders o
   WHERE d.id = e.dispute_id AND o.id = d.order_id AND o.purge_after < now() AND o.pii_purged_at IS NULL;
  GET DIAGNOSTICS v_evidence = ROW_COUNT;
  UPDATE woor.orders
     SET address_enc = NULL, address_key_id = NULL, buyer_phone_enc = NULL, buyer_phone_key_id = NULL,
         buyer_device_hash = NULL, claimed_at = NULL, pii_purged_at = now()
   WHERE purge_after < now() AND pii_purged_at IS NULL;
  GET DIAGNOSTICS v_orders = ROW_COUNT;
  DELETE FROM woor.location_proofs WHERE recorded_at < now() - make_interval(days => v_days);
  GET DIAGNOSTICS v_locations = ROW_COUNT;
  DELETE FROM woor.sessions WHERE expires_at < now() - make_interval(days => v_days);
  GET DIAGNOSTICS v_sessions = ROW_COUNT;
  DELETE FROM woor.push_subscriptions WHERE revoked_at < now() - make_interval(days => v_days);
  DELETE FROM woor.outbox WHERE processed_at < now() - interval '7 days';
  GET DIAGNOSTICS v_outbox = ROW_COUNT;
  PERFORM woor.log_event(NULL, 'system', NULL, 'retention.run',
                         jsonb_build_object('orders', v_orders, 'evidence', v_evidence, 'locations', v_locations,
                                            'sessions', v_sessions, 'outbox', v_outbox));
  RETURN jsonb_build_object('orders', v_orders, 'evidence', v_evidence, 'locations', v_locations,
                            'sessions', v_sessions, 'outbox', v_outbox);
END
$$;
COMMENT ON FUNCTION woor.purge_personal_data IS 'Efface adresse, téléphone acheteur, liaison d''appareil, preuves et positions 30 jours après la clôture.';

-- ---------------------------------------------------------------------
-- 25. Droits : rien par défaut, puis le strict nécessaire par rôle
-- ---------------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA woor, woor_secret, audit FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA woor, woor_secret, audit FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE woor_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

GRANT USAGE ON SCHEMA woor        TO woor_api, woor_worker, woor_readonly, woor_auditor;
GRANT USAGE ON SCHEMA audit       TO woor_api, woor_worker, woor_auditor;
GRANT USAGE ON SCHEMA woor_secret TO woor_worker;

-- API ------------------------------------------------------------------
GRANT SELECT ON woor.settings, woor.kill_switch, woor.permissions, woor.role_permissions, woor.order_transitions,
                woor.fx_quotes, woor.seller_couriers, woor.push_subscriptions, woor.payout_address_changes,
                woor.invoices, woor.payouts, woor.disputes, woor.dispute_evidence, woor.location_proofs, woor.strikes,
                woor.reconciliation_runs, woor.v_locked_totals, woor.v_seller_reputation, woor.v_courier_record,
                woor.v_order_stats, woor.v_user_strikes, woor.v_alerts, audit.events
  TO woor_api;
GRANT SELECT (id, role, display_name, phone_enc, phone_key_id, phone_last2, status, payout_ln_address,
              payout_address_set_at, identity_checked_at, identity_checked_by, suspended_reason, last_login_at,
              closed_at, created_at, updated_at) ON woor.users TO woor_api;
GRANT SELECT (id, user_id, kind, label, webauthn_id, sign_count, transports, failed_attempts, locked_until,
              created_at, last_used_at) ON woor.credentials TO woor_api;
GRANT SELECT (id, user_id, device_label, created_at, expires_at, last_seen_at, reauth_at, revoked_at, revoked_reason)
  ON woor.sessions TO woor_api;
GRANT SELECT (id, role, created_by, created_at, expires_at, used_by, used_at, revoked_at) ON woor.invites TO woor_api;
-- Ni empreinte du lien, ni appareil, ni code, ni téléphone acheteur : ces colonnes passent par les fonctions.
GRANT SELECT (id, seller_id, courier_id, item_label, item_price_xof, delivery_fee_xof, total_xof, address_enc,
              address_key_id, delivery_window, state, state_version, claimed_at, code_issued_at, code_reissues,
              code_attempts, code_locked_at, pay_deadline, pickup_deadline, hard_stop_at, locked_at, picked_up_at,
              arrived_at, delivered_at, closed_at, refusal_declared_at, no_show_declared_at, contest_deadline,
              cancelled_by_role, cancel_reason, purge_after, pii_purged_at, created_at, updated_at)
  ON woor.orders TO woor_api;

GRANT INSERT (public_token_hash, seller_id, courier_id, item_label, item_price_xof, delivery_fee_xof, address_enc,
              address_key_id, delivery_window)
  ON woor.orders TO woor_api;
GRANT INSERT (user_id, kind, label, webauthn_id, public_key, sign_count, transports, pin_hash, last_used_at)
  ON woor.credentials TO woor_api;
GRANT UPDATE (label, pin_hash) ON woor.credentials TO woor_api;
GRANT DELETE ON woor.credentials TO woor_api;
GRANT UPDATE (display_name) ON woor.users TO woor_api;
GRANT INSERT (user_id, endpoint, p256dh, auth) ON woor.push_subscriptions TO woor_api;
GRANT UPDATE (revoked_at) ON woor.push_subscriptions TO woor_api;
GRANT INSERT (dispute_id, kind, storage_key, sha256, note, submitted_by_role, submitted_by_user)
  ON woor.dispute_evidence TO woor_api;

GRANT EXECUTE ON FUNCTION
  woor.ctx_user(), woor.ctx_role(), woor.ctx_buyer_order(), woor.ctx_session(), woor.uuid_v7(), woor.secs(bigint),
  woor.setting_int(text), woor.can_see_order(uuid, uuid, uuid), woor.has_permission(text), woor.current_permissions(),
  -- comptes et sessions
  woor.create_invite(bytea, woor.app_role, bytea), woor.revoke_invite(uuid),
  woor.accept_invite(bytea, bytea, bytea, smallint, text, text),
  woor.login_lookup(bytea), woor.passkey_lookup(bytea), woor.record_login(uuid, boolean, bigint),
  woor.create_session(uuid, bytea, text, bytea, bytea), woor.session_lookup(bytea), woor.mark_reauth(uuid),
  woor.revoke_session(uuid), woor.set_user_status(uuid, woor.user_status, text), woor.verify_identity(uuid),
  woor.link_courier(uuid, uuid), woor.unlink_courier(uuid, uuid),
  -- acheteur
  woor.public_order_summary(bytea), woor.claim_order(bytea, bytea), woor.buyer_order(bytea, bytea),
  woor.request_invoices(uuid), woor.issue_delivery_code(uuid, bytea, bytea), woor.set_buyer_phone(uuid, bytea, smallint),
  woor.buyer_confirm_refusal(uuid),
  -- vendeuse
  woor.cancel_order(uuid, text), woor.reassign_courier(uuid, uuid),
  -- livreur
  woor.confirm_pickup(uuid), woor.courier_arrived(uuid, text, integer), woor.log_call_attempt(uuid),
  woor.declare_refusal(uuid), woor.declare_no_show(uuid, text, integer), woor.verify_delivery_code(uuid, bytea),
  woor.buyer_contact(uuid),
  -- litiges, versements, exploitation
  woor.open_dispute(uuid, woor.dispute_reason, text, text),
  woor.decide_dispute(uuid, woor.dispute_decision, text, bytea, boolean, uuid),
  woor.request_payout_address_change(text), woor.cancel_payout_address_change(uuid),
  woor.engage_kill_switch(text), woor.request_kill_switch_release(), woor.approve_kill_switch_release(),
  woor.update_setting(text, bigint), woor.add_strike(uuid, text, uuid)
  TO woor_api;

-- Service de paiements ---------------------------------------------------
GRANT SELECT ON woor.orders, woor.invoices, woor.payouts, woor.disputes, woor.users, woor.settings, woor.kill_switch,
                woor.fx_quotes, woor.outbox, woor.reconciliation_runs, woor.push_subscriptions,
                woor.v_due_timers, woor.v_locked_totals, woor.v_alerts
  TO woor_worker;
GRANT INSERT ON woor.invoices, woor.fx_quotes, woor.outbox, woor.reconciliation_runs TO woor_worker;
GRANT UPDATE (state, accepted_at, accept_height, min_htlc_expiry_height, settled_at, cancelled_at, cancel_reason)
  ON woor.invoices TO woor_worker;
GRANT UPDATE (destination, bolt11, payment_hash, state, attempts, next_attempt_at, last_error, fee_msat, succeeded_at)
  ON woor.payouts TO woor_worker;
GRANT UPDATE (pay_deadline, hard_stop_at) ON woor.orders TO woor_worker;
GRANT UPDATE (attempts, locked_until, processed_at, last_error, available_at) ON woor.outbox TO woor_worker;
GRANT UPDATE (finished_at, lnd_payments_seen, unmatched_payments, held_htlcs, min_margin_blocks, hot_balance_msat,
              status, details) ON woor.reconciliation_runs TO woor_worker;
GRANT UPDATE (revoked_at) ON woor.push_subscriptions TO woor_worker;
GRANT SELECT, INSERT ON woor_secret.invoice_preimages TO woor_worker;

GRANT EXECUTE ON FUNCTION
  woor.ctx_user(), woor.ctx_role(), woor.ctx_buyer_order(), woor.ctx_session(), woor.uuid_v7(), woor.secs(bigint),
  woor.setting_int(text), woor.apply_order_event(uuid, text, woor.app_role, uuid, jsonb), woor.fire_due_timers(),
  woor.assert_can_lock(integer), woor.schedule_payouts(uuid), woor.release_due_payouts(),
  woor.apply_due_address_changes(), woor.engage_kill_switch(text), woor.purge_personal_data(),
  woor.log_event(uuid, woor.app_role, uuid, text, jsonb), audit.verify_chain()
  TO woor_worker;

-- Mesures, audit ----------------------------------------------------------
GRANT SELECT ON woor.v_order_stats, woor.v_seller_reputation, woor.v_courier_record, woor.v_locked_totals TO woor_readonly;
GRANT EXECUTE ON FUNCTION woor.setting_int(text), woor.secs(bigint) TO woor_readonly;
GRANT SELECT ON audit.events TO woor_auditor;
GRANT EXECUTE ON FUNCTION audit.verify_chain() TO woor_auditor;

-- ---------------------------------------------------------------------
-- 26. Sécurité au niveau des lignes (RLS)
--     Le propriétaire et les fonctions SECURITY DEFINER n'y sont pas soumis.
-- ---------------------------------------------------------------------
ALTER TABLE woor.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.credentials            ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.sessions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.invites                ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.seller_couriers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.push_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.payout_address_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.payouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.disputes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.dispute_evidence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.location_proofs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.strikes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE woor.reconciliation_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.events                ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION woor.ctx_is_staff() RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT coalesce(woor.ctx_role() IN ('arbiter', 'admin'), false) $$;
GRANT EXECUTE ON FUNCTION woor.ctx_is_staff() TO woor_api;

-- Comptes
CREATE POLICY users_api_select ON woor.users FOR SELECT TO woor_api
  USING (id = woor.ctx_user() OR woor.ctx_is_staff()
         OR EXISTS (SELECT 1 FROM woor.seller_couriers sc
                     WHERE (sc.seller_id = woor.ctx_user() AND sc.courier_id = users.id)
                        OR (sc.courier_id = woor.ctx_user() AND sc.seller_id = users.id)));
CREATE POLICY users_api_update ON woor.users FOR UPDATE TO woor_api
  USING (id = woor.ctx_user()) WITH CHECK (id = woor.ctx_user());
CREATE POLICY users_worker ON woor.users FOR SELECT TO woor_worker USING (true);

CREATE POLICY credentials_api_own ON woor.credentials TO woor_api
  USING (user_id = woor.ctx_user()) WITH CHECK (user_id = woor.ctx_user());

CREATE POLICY sessions_api_select ON woor.sessions FOR SELECT TO woor_api
  USING (user_id = woor.ctx_user() OR woor.ctx_role() = 'admin');

CREATE POLICY invites_api_select ON woor.invites FOR SELECT TO woor_api
  USING (created_by = woor.ctx_user() OR woor.ctx_role() = 'admin');

CREATE POLICY seller_couriers_api_select ON woor.seller_couriers FOR SELECT TO woor_api
  USING (seller_id = woor.ctx_user() OR courier_id = woor.ctx_user() OR woor.ctx_is_staff());

CREATE POLICY push_api_own ON woor.push_subscriptions TO woor_api
  USING (user_id = woor.ctx_user()) WITH CHECK (user_id = woor.ctx_user());
CREATE POLICY push_worker ON woor.push_subscriptions TO woor_worker USING (true) WITH CHECK (true);

CREATE POLICY address_changes_api_select ON woor.payout_address_changes FOR SELECT TO woor_api
  USING (user_id = woor.ctx_user() OR woor.ctx_role() = 'admin');

-- Commandes et argent
CREATE POLICY orders_api_select ON woor.orders FOR SELECT TO woor_api
  USING (woor.can_see_order(seller_id, courier_id, id));
CREATE POLICY orders_api_insert ON woor.orders FOR INSERT TO woor_api
  WITH CHECK (woor.ctx_role() = 'seller' AND seller_id = woor.ctx_user());
CREATE POLICY orders_worker ON woor.orders TO woor_worker USING (true) WITH CHECK (true);

CREATE POLICY invoices_api_select ON woor.invoices FOR SELECT TO woor_api
  USING (order_id = woor.ctx_buyer_order() OR woor.ctx_is_staff());
CREATE POLICY invoices_worker ON woor.invoices TO woor_worker USING (true) WITH CHECK (true);

CREATE POLICY payouts_api_select ON woor.payouts FOR SELECT TO woor_api
  USING (beneficiary_id = woor.ctx_user() OR woor.ctx_is_staff()
         OR (kind = 'buyer_refund' AND order_id = woor.ctx_buyer_order()));
CREATE POLICY payouts_worker ON woor.payouts TO woor_worker USING (true) WITH CHECK (true);

CREATE POLICY disputes_api_select ON woor.disputes FOR SELECT TO woor_api
  USING (EXISTS (SELECT 1 FROM woor.orders o WHERE o.id = disputes.order_id));
CREATE POLICY disputes_worker ON woor.disputes FOR SELECT TO woor_worker USING (true);

CREATE POLICY evidence_api_select ON woor.dispute_evidence FOR SELECT TO woor_api
  USING (EXISTS (SELECT 1 FROM woor.disputes d WHERE d.id = dispute_evidence.dispute_id));
CREATE POLICY evidence_api_insert ON woor.dispute_evidence FOR INSERT TO woor_api
  WITH CHECK (EXISTS (SELECT 1 FROM woor.disputes d WHERE d.id = dispute_evidence.dispute_id AND d.state = 'open')
              AND submitted_by_role = woor.ctx_role()
              AND submitted_by_user IS NOT DISTINCT FROM (CASE WHEN woor.ctx_role() = 'buyer' THEN NULL ELSE woor.ctx_user() END));

CREATE POLICY locations_api_select ON woor.location_proofs FOR SELECT TO woor_api
  USING (EXISTS (SELECT 1 FROM woor.orders o WHERE o.id = location_proofs.order_id));

CREATE POLICY strikes_api_select ON woor.strikes FOR SELECT TO woor_api
  USING (user_id = woor.ctx_user() OR woor.ctx_is_staff());

CREATE POLICY reconciliation_api_select ON woor.reconciliation_runs FOR SELECT TO woor_api USING (woor.ctx_is_staff());
CREATE POLICY reconciliation_worker ON woor.reconciliation_runs TO woor_worker USING (true) WITH CHECK (true);

-- Journal
CREATE POLICY audit_api_select ON audit.events FOR SELECT TO woor_api
  USING (woor.ctx_is_staff() OR (order_id IS NOT NULL AND EXISTS (SELECT 1 FROM woor.orders o WHERE o.id = events.order_id)));
CREATE POLICY audit_auditor ON audit.events FOR SELECT TO woor_auditor USING (true);

-- ---------------------------------------------------------------------
-- 27. Données de référence
-- ---------------------------------------------------------------------
INSERT INTO woor.kill_switch DEFAULT VALUES;

INSERT INTO woor.settings (key, value, min_value, max_value, unit, description) VALUES
  ('max_order_xof',               50000,  1000,  50000,   'xof',    'Prix maximum d''un article pendant le pilote'),
  ('max_total_locked_xof',        300000, 0,     1000000, 'xof',    'Montant engagé maximum, toutes commandes confondues'),
  ('max_concurrent_htlcs',        100,    2,     400,     'count',  'Factures ouvertes ou bloquées en même temps (LND : 483 HTLC par canal)'),
  ('payment_window_sec',          900,    300,   1800,    'sec',    'Temps pour payer les deux factures'),
  ('order_link_ttl_sec',          86400,  3600,  172800,  'sec',    'Durée de vie d''un lien jamais payé'),
  ('pickup_window_sec',           14400,  1800,  21600,   'sec',    'Délai de ramassage après le blocage'),
  ('hard_stop_sec',               64800,  21600, 64800,   'sec',    'Arrêt final après le blocage (18 h)'),
  ('cltv_delta_blocks',           144,    80,    288,     'blocks', 'Delta CLTV final des hold invoices'),
  ('safety_margin_blocks',        36,     18,    72,      'blocks', 'Marge minimale avant l''expiration réelle des HTLC'),
  ('wait_on_site_sec',            900,    300,   1800,    'sec',    'Attente sur place avant « Acheteur absent »'),
  ('no_show_min_calls',           2,      1,     5,       'count',  'Appels à l''acheteur avant « Acheteur absent »'),
  ('contest_window_sec',          600,    300,   1800,    'sec',    'Fenêtre de contestation de l''acheteur'),
  ('dispute_decision_sec',        7200,   1800,  14400,   'sec',    'Délai de décision d''un litige'),
  ('new_seller_orders',           5,      0,     20,      'count',  'Premières commandes d''une vendeuse ou d''un duo avec versement différé'),
  ('new_seller_payout_delay_sec', 7200,   0,     86400,   'sec',    'Durée du versement différé'),
  ('code_max_attempts',           5,      3,     5,       'count',  'Codes faux avant verrouillage de la commande'),
  ('pin_max_attempts',            5,      3,     5,       'count',  'PIN faux avant blocage'),
  ('pin_lock_sec',                900,    300,   86400,   'sec',    'Durée du blocage du PIN'),
  ('session_ttl_sec',             43200,  3600,  43200,   'sec',    'Session vendeuse et livreur (12 h)'),
  ('staff_session_idle_sec',      900,    300,   1800,    'sec',    'Session arbitre et administrateur, glissante (15 min)'),
  ('reauth_window_sec',           300,    60,    600,     'sec',    'Validité d''une passkey redemandée pour une action sensible'),
  ('invite_ttl_sec',              172800, 3600,  172800,  'sec',    'Validité d''une invitation (48 h)'),
  ('seller_open_invites',         5,      0,     20,      'count',  'Invitations de livreurs en attente par vendeuse'),
  ('routing_fee_max_ppm',         10000,  1000,  30000,   'ppm',    'Frais de routage maximum par versement (1 %)'),
  ('hot_balance_max_xof',         150000, 0,     1000000, 'xof',    'Solde chaud maximum sur le nœud'),
  ('pilot_fund_cap_xof',          50000,  0,     300000,  'xof',    'Fonds du pilote pour dédommager les livreurs'),
  ('pii_retention_days',          30,     7,     90,      'days',   'Conservation des données personnelles après clôture'),
  ('max_open_orders_per_device',  3,      1,     10,      'count',  'Commandes ouvertes par téléphone acheteur'),
  ('seller_orders_per_day',       30,     1,     200,     'count',  'Commandes créées par vendeuse en 24 h'),
  ('require_identity_check',      1,      0,     1,       'bool',   'Identité vérifiée en personne avant la première commande');

INSERT INTO woor.order_transitions (from_state, event, to_state, allowed_roles) VALUES
  ('awaiting_payment', 'invoices_locked',     'locked',       '{system}'),
  ('awaiting_payment', 'payment_timeout',     'expired',      '{system}'),
  ('awaiting_payment', 'cancel',              'expired',      '{seller,buyer}'),
  ('locked',           'pickup_confirmed',    'in_transit',   '{courier}'),
  ('locked',           'cancel',              'refunded',     '{seller,buyer}'),
  ('locked',           'pickup_timeout',      'refunded',     '{system}'),
  ('locked',           'dispute_timeout',     'refunded',     '{system}'),
  ('locked',           'decide_cancel_both',  'refunded',     '{arbiter}'),
  ('locked',           'hard_stop',           'refunded',     '{system}'),
  ('in_transit',       'code_valid',          'delivered',    '{courier}'),
  ('in_transit',       'refusal_confirmed',   'courier_paid', '{buyer,system}'),
  ('in_transit',       'no_show_confirmed',   'courier_paid', '{system}'),
  ('in_transit',       'cancel',              'courier_paid', '{buyer}'),
  ('in_transit',       'dispute_opened',      'disputed',     '{buyer,seller,courier,arbiter,system}'),
  ('in_transit',       'hard_stop',           'refunded',     '{system}'),
  ('disputed',         'decide_settle_both',  'delivered',    '{arbiter}'),
  ('disputed',         'decide_fee_only',     'courier_paid', '{arbiter}'),
  ('disputed',         'decide_cancel_both',  'refunded',     '{arbiter}'),
  ('disputed',         'decide_resume',       'in_transit',   '{arbiter}'),
  ('disputed',         'dispute_timeout',     'refunded',     '{system}'),
  ('disputed',         'hard_stop',           'refunded',     '{system}'),
  ('delivered',        'payouts_done',        'paid_out',     '{system}'),
  ('delivered',        'decide_refund_buyer', 'refunded',     '{arbiter}');

INSERT INTO woor.permissions (code, description) VALUES
  ('auth.session',                  'Se connecter, se déconnecter, voir et fermer ses sessions'),
  ('account.read_self',             'Voir son compte'),
  ('account.credentials',           'Ajouter ou retirer une passkey, changer son PIN'),
  ('push.subscribe',                'Recevoir les notifications'),
  ('payout_address.request',        'Changer son adresse de versement'),
  ('payout.read',                   'Voir des versements'),
  ('order.create',                  'Créer une commande'),
  ('order.read',                    'Voir une commande'),
  ('order.list',                    'Lister des commandes'),
  ('order.timeline',                'Voir la chronologie d''une commande'),
  ('order.cancel',                  'Annuler une commande'),
  ('order.reassign_courier',        'Changer de livreur avant le paiement'),
  ('order.claim',                   'Lier son téléphone à une commande'),
  ('order.track',                   'Suivre une commande en direct'),
  ('buyer.set_phone',               'Donner son numéro au livreur'),
  ('invoice.request',               'Obtenir les factures A et B'),
  ('code.receive',                  'Recevoir le code de remise'),
  ('pickup.show_qr',                'Afficher le QR de ramassage'),
  ('pickup.confirm',                'Scanner le QR de ramassage'),
  ('delivery.arrive',               'Signaler son arrivée'),
  ('delivery.call',                 'Appeler l''acheteur'),
  ('delivery.submit_code',          'Saisir le code de remise'),
  ('delivery.declare_refusal',      'Déclarer un refus à la porte'),
  ('delivery.declare_no_show',      'Déclarer l''acheteur absent'),
  ('delivery.confirm_refusal',      'Confirmer son refus'),
  ('delivery.contest',              'Contester un refus ou une absence, signaler un article non conforme'),
  ('buyer_contact.read',            'Voir le téléphone de l''acheteur'),
  ('dispute.open',                  'Ouvrir un litige'),
  ('dispute.report_after_delivery', 'Signaler « Je n''ai rien reçu » ou « Ce n''était pas moi »'),
  ('dispute.add_evidence',          'Ajouter une preuve à un litige ouvert'),
  ('dispute.read',                  'Voir un litige'),
  ('dispute.decide',                'Trancher un litige'),
  ('code.reissue',                  'Générer un nouveau code de remise'),
  ('courier.invite',                'Inviter ses livreurs'),
  ('courier.link',                  'Associer un livreur existant à une vendeuse'),
  ('courier.unlink',                'Retirer un livreur de sa liste'),
  ('user.invite',                   'Inviter une vendeuse, un livreur, un arbitre ou un administrateur'),
  ('user.verify_identity',          'Marquer une identité vérifiée en personne'),
  ('user.suspend',                  'Suspendre une vendeuse ou un livreur'),
  ('user.reactivate',               'Réactiver ou clore un compte'),
  ('strike.add',                    'Donner un avertissement'),
  ('strike.read',                   'Voir des avertissements'),
  ('kill_switch.engage',            'Activer l''interrupteur général'),
  ('kill_switch.release',           'Demander ou valider la réactivation'),
  ('settings.update',               'Modifier plafonds et minuteurs'),
  ('audit.read',                    'Lire le journal d''audit'),
  ('report.read',                   'Voir les mesures du pilote'),
  ('alerts.read',                   'Voir les alertes et la santé du nœud'),
  ('system.invoice',                'Créer, régler et annuler les hold invoices'),
  ('system.payout',                 'Exécuter les versements'),
  ('system.timer',                  'Appliquer les échéances'),
  ('system.maintenance',            'Réconciliation, conservation des données, changements d''adresse dus');

INSERT INTO woor.role_permissions (role, permission, scope) VALUES
  -- Vendeuse
  ('seller', 'auth.session', 'self'), ('seller', 'account.read_self', 'self'), ('seller', 'account.credentials', 'self'),
  ('seller', 'push.subscribe', 'self'), ('seller', 'payout_address.request', 'self'), ('seller', 'payout.read', 'self'),
  ('seller', 'order.create', 'own'), ('seller', 'order.read', 'own'), ('seller', 'order.list', 'own'),
  ('seller', 'order.timeline', 'own'), ('seller', 'order.cancel', 'own'), ('seller', 'order.reassign_courier', 'own'),
  ('seller', 'pickup.show_qr', 'own'), ('seller', 'dispute.open', 'own'), ('seller', 'dispute.add_evidence', 'own'),
  ('seller', 'dispute.read', 'own'), ('seller', 'courier.invite', 'own'), ('seller', 'courier.unlink', 'own'),
  ('seller', 'strike.read', 'self'),
  -- Livreur
  ('courier', 'auth.session', 'self'), ('courier', 'account.read_self', 'self'), ('courier', 'account.credentials', 'self'),
  ('courier', 'push.subscribe', 'self'), ('courier', 'payout_address.request', 'self'), ('courier', 'payout.read', 'self'),
  ('courier', 'order.read', 'assigned'), ('courier', 'order.list', 'assigned'), ('courier', 'order.timeline', 'assigned'),
  ('courier', 'pickup.confirm', 'assigned'), ('courier', 'delivery.arrive', 'assigned'), ('courier', 'delivery.call', 'assigned'),
  ('courier', 'delivery.submit_code', 'assigned'), ('courier', 'delivery.declare_refusal', 'assigned'),
  ('courier', 'delivery.declare_no_show', 'assigned'), ('courier', 'buyer_contact.read', 'assigned'),
  ('courier', 'dispute.open', 'assigned'), ('courier', 'dispute.add_evidence', 'assigned'),
  ('courier', 'dispute.read', 'assigned'), ('courier', 'strike.read', 'self'),
  -- Acheteur : appareil lié, sans compte
  ('buyer', 'order.read', 'link'), ('buyer', 'order.claim', 'link'), ('buyer', 'order.track', 'device'),
  ('buyer', 'order.timeline', 'device'), ('buyer', 'buyer.set_phone', 'device'), ('buyer', 'invoice.request', 'device'),
  ('buyer', 'code.receive', 'device'), ('buyer', 'order.cancel', 'device'), ('buyer', 'delivery.confirm_refusal', 'device'),
  ('buyer', 'delivery.contest', 'device'), ('buyer', 'dispute.open', 'device'),
  ('buyer', 'dispute.report_after_delivery', 'device'), ('buyer', 'dispute.add_evidence', 'device'),
  ('buyer', 'dispute.read', 'device'), ('buyer', 'payout.read', 'device'),
  -- Arbitre
  ('arbiter', 'auth.session', 'self'), ('arbiter', 'account.read_self', 'self'), ('arbiter', 'account.credentials', 'self'),
  ('arbiter', 'push.subscribe', 'self'), ('arbiter', 'order.read', 'all'), ('arbiter', 'order.list', 'all'),
  ('arbiter', 'order.timeline', 'all'), ('arbiter', 'payout.read', 'all'), ('arbiter', 'buyer_contact.read', 'all'),
  ('arbiter', 'dispute.open', 'all'), ('arbiter', 'dispute.add_evidence', 'all'), ('arbiter', 'dispute.read', 'all'),
  ('arbiter', 'dispute.decide', 'all'), ('arbiter', 'code.reissue', 'all'), ('arbiter', 'user.suspend', 'all'),
  ('arbiter', 'strike.add', 'all'), ('arbiter', 'strike.read', 'all'), ('arbiter', 'kill_switch.engage', 'all'),
  ('arbiter', 'kill_switch.release', 'all'), ('arbiter', 'audit.read', 'all'), ('arbiter', 'report.read', 'all'),
  ('arbiter', 'alerts.read', 'all'),
  -- Administrateur technique
  ('admin', 'auth.session', 'self'), ('admin', 'account.read_self', 'self'), ('admin', 'account.credentials', 'self'),
  ('admin', 'order.read', 'all'), ('admin', 'order.list', 'all'), ('admin', 'order.timeline', 'all'),
  ('admin', 'payout.read', 'all'), ('admin', 'courier.link', 'all'), ('admin', 'courier.unlink', 'all'),
  ('admin', 'user.invite', 'all'), ('admin', 'user.verify_identity', 'all'), ('admin', 'user.suspend', 'all'),
  ('admin', 'user.reactivate', 'all'), ('admin', 'strike.add', 'all'), ('admin', 'strike.read', 'all'),
  ('admin', 'kill_switch.engage', 'all'), ('admin', 'settings.update', 'all'), ('admin', 'audit.read', 'all'),
  ('admin', 'report.read', 'all'), ('admin', 'alerts.read', 'all'),
  -- Système : service de paiements et planificateur
  ('system', 'system.invoice', 'all'), ('system', 'system.payout', 'all'), ('system', 'system.timer', 'all'),
  ('system', 'system.maintenance', 'all'), ('system', 'kill_switch.engage', 'all');

RESET ROLE;
COMMIT;

-- ---------------------------------------------------------------------
-- Après installation (hors script) : comptes de connexion, un par service
--   CREATE ROLE woor_api_app      LOGIN PASSWORD '<secret>' IN ROLE woor_api;
--   CREATE ROLE woor_worker_app   LOGIN PASSWORD '<secret>' IN ROLE woor_worker;
--   CREATE ROLE woor_migrator     LOGIN PASSWORD '<secret>' IN ROLE woor_owner;
--   CREATE ROLE woor_metrics_app  LOGIN PASSWORD '<secret>' IN ROLE woor_readonly;
--   CREATE ROLE woor_auditor_app  LOGIN PASSWORD '<secret>' IN ROLE woor_auditor;
--   CREATE ROLE woor_backup_app   LOGIN BYPASSRLS PASSWORD '<secret>' IN ROLE woor_backup;
-- Premier administrateur, en tant que woor_owner :
--   SELECT woor.create_bootstrap_invite(sha256('<code à usage unique>'::bytea));
-- ---------------------------------------------------------------------
