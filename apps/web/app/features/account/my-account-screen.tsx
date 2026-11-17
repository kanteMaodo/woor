import { Form } from "react-router";

import { Chip } from "../../components/ui/chip";
import { Icon } from "../../components/ui/icon";
import type { Profile } from "../../lib/api/account-schemas";
import { formatTime } from "../../lib/format";
import { AccountScreen } from "./account-screen";
import type { SecurityView } from "./account-views";

const ROLE_NAME: Record<Profile["role"], string> = {
  seller: "Vendeuse",
  courier: "Livreur",
  arbiter: "Arbitre",
  admin: "Administrateur",
};

interface MyAccountScreenProps {
  profile: Profile;
  security: SecurityView;
}

/** S8 : le compte, ses clés et ses sessions. Rien à configurer, tout à vérifier. */
export function MyAccountScreen({ profile, security }: MyAccountScreenProps) {
  return (
    <AccountScreen profile={profile} title="Mon compte">
      <section className="panel account-hero">
        <span className="initial big" aria-hidden="true">
          {profile.displayName.charAt(0)}
        </span>
        <div className="kv">
          <b className="account-name">{profile.displayName}</b>
          <span className="muted">
            {ROLE_NAME[profile.role]}
            {security.phoneLast2 ? ` · n° … ${security.phoneLast2}` : ""}
          </span>
        </div>
      </section>

      <div className="split">
        <div className="split-main">
          <section className="panel">
            <h2>
              <Icon name="key" /> Mes clés
            </h2>
            <div className="person-row">
              <span className="initial" aria-hidden="true">
                <Icon name="finger" />
              </span>
              <span className="person-text">
                <b>Passkey de ce téléphone</b>
                <span>
                  {security.hasPasskey && security.passkeyAddedAt
                    ? `ajoutée à ${formatTime(security.passkeyAddedAt)}`
                    : "pas encore créée"}
                </span>
              </span>
            </div>
            <div className="person-row">
              <span className="initial" aria-hidden="true">
                <Icon name="key" />
              </span>
              <span className="person-text">
                <b>PIN de secours</b>
                <span>{security.hasPin ? "défini" : "non défini"}</span>
              </span>
            </div>
          </section>

          <section className="panel">
            <h2>
              <Icon name="phone" /> Sessions ouvertes
            </h2>
            {security.sessions.map((session) => (
              <div key={session.id} className="person-row">
                <span className="person-text">
                  <b>{session.label}</b>
                  <span>
                    {session.current ? "cette session" : "autre appareil"}
                    {session.expiresAt ? ` · expire à ${formatTime(session.expiresAt)}` : ""}
                  </span>
                </span>
                {!session.current && (
                  <button type="button" className="btn-link" disabled title="Bientôt disponible">
                    Fermer
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>

        <aside className="split-side">
          <section className="panel summary">
            <div className="row">
              <span>
                <Icon name="bell" size="sm" /> Notifications
              </span>
              {security.notifications ? (
                <Chip tone="locked" icon="check" label="Activées" />
              ) : (
                <Chip tone="wait" icon="clock" label="Désactivées" />
              )}
            </div>
          </section>
          <Form method="post" action="/deconnexion">
            <button type="submit" className="btn btn-secondary">
              <Icon name="power" />
              Se déconnecter
            </button>
          </Form>
        </aside>
      </div>
    </AccountScreen>
  );
}
