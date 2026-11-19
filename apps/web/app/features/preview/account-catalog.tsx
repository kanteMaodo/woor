import type { ReactNode } from "react";

import type { Delivery, Profile, SellerOrder } from "../../lib/api/account-schemas";
import { InvitationScreen } from "../account/invitation-screen";
import { LoginScreen } from "../account/login-screen";
import { MyAccountScreen } from "../account/my-account-screen";
import { PayoutsScreen } from "../account/payouts-screen";
import { CodeLockedScreen } from "../courier/screens/code-locked-screen";
import { DeclareProblemScreen } from "../courier/screens/declare-problem-screen";
import { DeliveriesScreen } from "../courier/screens/deliveries-screen";
import { DeliveryScreen } from "../courier/screens/delivery-screen";
import { CouriersScreen } from "../seller/screens/couriers-screen";
import { NewOrderScreen } from "../seller/screens/new-order-screen";
import { PickupQrScreen } from "../seller/screens/pickup-qr-screen";
import { SellerOrderScreen } from "../seller/screens/seller-order-screen";
import { SellerOrdersScreen } from "../seller/screens/seller-orders-screen";
import { ShareLinkScreen } from "../seller/screens/share-link-screen";
import { AccountRecordScreen } from "../staff/screens/account-record-screen";
import { AccountsScreen } from "../staff/screens/accounts-screen";
import { ArbiterDashboardScreen } from "../staff/screens/arbiter-dashboard-screen";
import { DisputeScreen } from "../staff/screens/dispute-screen";
import { KillSwitchScreen } from "../staff/screens/kill-switch-screen";
import { SettingsScreen } from "../staff/screens/settings-screen";

/**
 * Écrans fictifs des comptes (vendeuse, livreur, équipe), pour l’aperçu en développement.
 * Les dates sont fixes : le rendu est identique sur le serveur et dans le navigateur.
 */
export interface PreviewExtras {
  /** QR de ramassage, fabriqué par le serveur. */
  qrSvg: string;
}

export interface CatalogEntry {
  slug: string;
  label: string;
  render: (extras: PreviewExtras) => ReactNode;
}

const BASE = Date.parse("2026-11-17T14:30:00Z");
const at = (minutes: number) => new Date(BASE + minutes * 60_000).toISOString();

const SELLER: Profile = { displayName: "Awa Couture", role: "seller" };
const COURIER: Profile = { displayName: "Moussa Diop", role: "courier" };
const ARBITER: Profile = { displayName: "Ibrahima Sarr", role: "arbiter" };
const ADMIN: Profile = { displayName: "Aïssatou Ndiaye", role: "admin" };

const DEMO_ACCOUNTS = [
  { label: "Vendeuse", phone: "77 000 00 01", pin: "111111" },
  { label: "Livreur", phone: "77 000 00 02", pin: "222222" },
];

function order(overrides: Partial<SellerOrder>): SellerOrder {
  return {
    id: "0190a1b2-0000-7000-8000-000000000001",
    itemLabel: "Robe en wax, taille M",
    itemPriceXof: 12_000,
    deliveryFeeXof: 1_500,
    totalXof: 13_500,
    state: "awaiting_payment",
    courierName: "Moussa Diop",
    neighborhood: "Sacré-Cœur 3",
    landmark: "Derrière la boulangerie, portail bleu",
    createdAt: at(-80),
    claimedAt: null,
    lockedAt: null,
    pickedUpAt: null,
    arrivedAt: null,
    deliveredAt: null,
    closedAt: null,
    ...overrides,
  };
}

function delivery(overrides: Partial<Delivery>): Delivery {
  return {
    id: "0190a1b2-0000-7000-8000-000000000001",
    itemLabel: "Robe en wax, taille M",
    deliveryFeeXof: 1_500,
    state: "in_transit",
    sellerName: "Awa Couture",
    neighborhood: "Sacré-Cœur 3",
    landmark: "Derrière la boulangerie, portail bleu",
    lockedAt: at(-63),
    pickupDeadline: at(177),
    pickedUpAt: at(-34),
    deliveredAt: null,
    closedAt: null,
    codeAttemptsLeft: 5,
    codeLocked: false,
    ...overrides,
  };
}

const IN_TRANSIT = order({
  state: "in_transit",
  claimedAt: at(-66),
  lockedAt: at(-63),
  pickedUpAt: at(-34),
});
const LOCKED = order({
  id: "0190a1b2-0000-7000-8000-000000000002",
  itemLabel: "Sac en cuir",
  itemPriceXof: 15_000,
  totalXof: 16_500,
  state: "locked",
  neighborhood: "Liberté 6",
  claimedAt: at(-20),
  lockedAt: at(-18),
});
const ORDERS = [
  IN_TRANSIT,
  LOCKED,
  order({
    id: "0190a1b2-0000-7000-8000-000000000003",
    itemLabel: "Boubou brodé",
    itemPriceXof: 9_000,
    totalXof: 10_500,
    neighborhood: "Médina",
  }),
  order({
    id: "0190a1b2-0000-7000-8000-000000000004",
    itemLabel: "Sandales 39",
    itemPriceXof: 8_000,
    totalXof: 9_500,
    state: "paid_out",
    neighborhood: "Point E",
    deliveredAt: at(-200),
    closedAt: at(-80),
  }),
];

const TO_PICK_UP = delivery({
  id: "0190a1b2-0000-7000-8000-000000000002",
  itemLabel: "Sac en cuir",
  state: "locked",
  neighborhood: "Liberté 6",
  landmark: "Immeuble jaune, 2e étage",
  pickedUpAt: null,
});

const SECURITY = {
  phoneLast2: "01",
  hasPasskey: true,
  passkeyAddedAt: at(-1440),
  hasPin: true,
  notifications: true,
  sessions: [
    { id: "s1", label: "Ce téléphone", current: true, expiresAt: at(600) },
    { id: "s2", label: "Tablette", current: false, expiresAt: at(200) },
  ],
};

export const ACCOUNT_CATALOG: CatalogEntry[] = [
  {
    slug: "invitation",
    label: "O1 · Invitation",
    render: () => (
      <InvitationScreen invitedBy="Awa Couture" roleLabel="Livreur" phone="77 000 00 47" />
    ),
  },
  {
    slug: "connexion",
    label: "O2 · Connexion",
    render: () => <LoginScreen error={null} phone="" demoAccounts={DEMO_ACCOUNTS} />,
  },
  {
    slug: "connexion-erreur",
    label: "O2 · Connexion refusée",
    render: () => (
      <LoginScreen
        error="Numéro ou PIN incorrect."
        phone="77 000 00 01"
        demoAccounts={DEMO_ACCOUNTS}
      />
    ),
  },
  {
    slug: "vendeuse",
    label: "S1 · Tableau de bord vendeuse",
    render: () => <SellerOrdersScreen profile={SELLER} orders={ORDERS} filter="en-cours" />,
  },
  {
    slug: "vendeuse-nouvelle",
    label: "S2 · Nouvelle commande",
    render: () => (
      <NewOrderScreen
        profile={SELLER}
        error={null}
        couriers={[{ id: "c1", displayName: "Moussa Diop", phoneLast2: "02" }]}
      />
    ),
  },
  {
    slug: "vendeuse-lien",
    label: "S3 · Partager le lien",
    render: () => (
      <ShareLinkScreen
        profile={SELLER}
        order={{
          orderId: IN_TRANSIT.id,
          itemLabel: IN_TRANSIT.itemLabel,
          totalXof: IN_TRANSIT.totalXof,
          link: "http://localhost:5173/o/7K3Qx9mPa2bC4dE5fG6hIj",
        }}
      />
    ),
  },
  {
    slug: "vendeuse-qr",
    label: "S4 · QR de ramassage",
    render: ({ qrSvg }) => (
      <PickupQrScreen profile={SELLER} order={LOCKED} qrSvg={qrSvg} validUntil={at(220)} />
    ),
  },
  {
    slug: "vendeuse-commande",
    label: "S5 · Détail d’une commande",
    render: () => <SellerOrderScreen profile={SELLER} order={IN_TRANSIT} error={null} />,
  },
  {
    slug: "vendeuse-versements",
    label: "S6 · Versements et adresse",
    render: () => (
      <PayoutsScreen
        profile={SELLER}
        address={{
          current: "awa@wallet.example",
          testedAt: at(-150),
          pendingChange: {
            address: "nouvelle@wallet.example",
            requestedAt: at(-10),
            effectiveAt: at(1430),
          },
        }}
        payouts={[
          {
            id: "p1",
            label: "Sandales 39",
            amountXof: 8_000,
            status: "received",
            when: "Aujourd’hui 12:05",
          },
          {
            id: "p2",
            label: "Robe en wax, taille M",
            amountXof: 12_000,
            status: "upcoming",
            when: "Après la remise",
          },
          {
            id: "p3",
            label: "Sac en cuir",
            amountXof: 15_000,
            status: "upcoming",
            when: "Après la remise",
          },
        ]}
      />
    ),
  },
  {
    slug: "vendeuse-livreurs",
    label: "S7 · Mes livreurs",
    render: () => (
      <CouriersScreen
        profile={SELLER}
        couriers={[
          {
            id: "c1",
            displayName: "Moussa Diop",
            phoneLast2: "02",
            status: "active",
            detail: "28 livraisons · identité vérifiée",
          },
          {
            id: "c2",
            displayName: "Abdou",
            phoneLast2: "63",
            status: "to_verify",
            detail: "Identité à vérifier par l’équipe",
          },
          {
            id: "c3",
            displayName: "Ibou",
            phoneLast2: "12",
            status: "invited",
            detail: "Invitation envoyée, expire dans 41 h",
          },
        ]}
      />
    ),
  },
  {
    slug: "vendeuse-compte",
    label: "S8 · Mon compte",
    render: () => <MyAccountScreen profile={SELLER} security={SECURITY} />,
  },
  {
    slug: "livreur",
    label: "C1 · Tableau de bord livreur",
    render: () => (
      <DeliveriesScreen
        profile={COURIER}
        deliveries={[
          TO_PICK_UP,
          delivery({}),
          delivery({
            id: "0190a1b2-0000-7000-8000-000000000004",
            itemLabel: "Sandales 39",
            state: "paid_out",
            neighborhood: "Point E",
            deliveredAt: at(-200),
          }),
        ]}
      />
    ),
  },
  {
    slug: "livreur-ramassage",
    label: "C2-C3 · Course à ramasser",
    render: () => <DeliveryScreen profile={COURIER} delivery={TO_PICK_UP} error={null} />,
  },
  {
    slug: "livreur-code",
    label: "C4 · Saisir le code",
    render: () => (
      <DeliveryScreen
        profile={COURIER}
        delivery={delivery({ codeAttemptsLeft: 4 })}
        error="Code faux. Il reste 4 essai(s)."
      />
    ),
  },
  {
    slug: "livreur-confirme",
    label: "C5 · Paiement confirmé",
    render: () => (
      <DeliveryScreen
        profile={COURIER}
        delivery={delivery({ state: "delivered", deliveredAt: at(-1) })}
        error={null}
      />
    ),
  },
  {
    slug: "livreur-absent",
    label: "C6 · Acheteur absent",
    render: () => (
      <DeclareProblemScreen
        profile={COURIER}
        delivery={delivery({})}
        facts={{
          arrivedAt: "14:32",
          waitedEnough: true,
          calls: ["14:35", "14:41"],
          locationAttached: true,
        }}
      />
    ),
  },
  {
    slug: "livreur-verrouille",
    label: "C7 · Code verrouillé",
    render: () => (
      <CodeLockedScreen
        profile={COURIER}
        delivery={delivery({ codeLocked: true, codeAttemptsLeft: 0 })}
        disputeOpenedAt="14:48"
        decisionBefore="16:48"
      />
    ),
  },
  {
    slug: "livreur-versements",
    label: "C8 · Mes versements",
    render: () => (
      <PayoutsScreen
        profile={COURIER}
        address={{ current: "moussa@wallet.example", testedAt: at(-600), pendingChange: null }}
        payouts={[
          {
            id: "p1",
            label: "Course · Sandales 39",
            amountXof: 1_500,
            status: "received",
            when: "Aujourd’hui 12:05",
          },
          {
            id: "p2",
            label: "Course · Robe en wax",
            amountXof: 1_500,
            status: "upcoming",
            when: "Après la remise",
          },
          {
            id: "p3",
            label: "Course · Pagne tissé",
            amountXof: 1_500,
            status: "received",
            when: "Acheteur absent, non contesté",
          },
          {
            id: "p4",
            label: "Dédommagement · Montre",
            amountXof: 2_000,
            status: "received",
            when: "Décision de l’arbitre",
          },
        ]}
      />
    ),
  },
  {
    slug: "livreur-compte",
    label: "Livreur · Mon compte",
    render: () => (
      <MyAccountScreen profile={COURIER} security={{ ...SECURITY, phoneLast2: "02" }} />
    ),
  },
  {
    slug: "arbitre",
    label: "A1 · Tableau de bord arbitre",
    render: () => (
      <ArbiterDashboardScreen
        profile={ARBITER}
        health={{
          lockedXof: 186_500,
          lockedCapXof: 300_000,
          heldPayments: 18,
          maxPayments: 100,
          htlcMarginBlocks: 92,
          nodeOnline: true,
          reconciliation: "OK · il y a 40 s",
        }}
        alerts={[
          {
            id: "d1",
            kind: "dispute",
            title: "Litige : code verrouillé",
            detail: "Robe en wax · décision avant 16:48",
          },
          {
            id: "w1",
            kind: "payout",
            title: "Versement en attente d’adresse",
            detail: "Abdou · course de 1 500 F",
          },
        ]}
      />
    ),
  },
  {
    slug: "arbitre-litige",
    label: "A2 · Trancher un litige",
    render: () => (
      <DisputeScreen
        profile={ARBITER}
        dispute={{
          id: "d1",
          reasonLabel: "Code verrouillé",
          decideBefore: "16:48",
          itemLabel: "Robe en wax, taille M",
          events: [
            { at: "13:27", label: "Paiements bloqués (13 500 F)" },
            { at: "13:58", label: "Ramassé par Moussa" },
            { at: "14:32", label: "Arrivée, position edkm7b" },
            { at: "14:40", label: "5 codes faux en 7 min" },
          ],
          contacts: [{ label: "L’acheteur" }, { label: "Moussa" }, { label: "Awa" }],
        }}
      />
    ),
  },
  {
    slug: "arbitre-interrupteur",
    label: "A3 · Interrupteur général",
    render: () => (
      <KillSwitchScreen
        profile={ARBITER}
        killSwitch={{
          engagedAt: "15:02",
          engagedBy: "Ibrahima",
          reason: "écart de réconciliation",
          releaseRequestedBy: "Ibrahima",
          releaseRequestedAt: "15:20",
          requestedByMe: true,
        }}
      />
    ),
  },
  {
    slug: "arbitre-fiche",
    label: "A4 · Fiche d’un compte",
    render: () => (
      <AccountRecordScreen
        profile={ARBITER}
        record={{
          displayName: "Moussa Diop",
          roleLabel: "Livreur",
          phoneLast2: "02",
          verified: true,
          metrics: [
            { label: "Livraisons", value: "28" },
            { label: "Absences déclarées", value: "3" },
            { label: "Contestées", value: "3" },
            { label: "Avertissements", value: "1" },
          ],
          lastStrike: "Litige du 2 nov. : colis jamais remis, versement annulé.",
        }}
      />
    ),
  },
  {
    slug: "admin",
    label: "D1 · Comptes",
    render: () => (
      <AccountsScreen
        profile={ADMIN}
        accounts={[
          {
            id: "u1",
            displayName: "Awa Couture",
            detail: "Vendeuse · identité vérifiée",
            status: "active",
          },
          {
            id: "u2",
            displayName: "Mariama Ba",
            detail: "Vendeuse · à vérifier en personne",
            status: "to_verify",
          },
          {
            id: "u3",
            displayName: "Abdou",
            detail: "Livreur d’Awa · invité hier",
            status: "to_verify",
          },
          { id: "u4", displayName: "Ibrahima Sarr", detail: "Arbitre", status: "staff" },
        ]}
      />
    ),
  },
  {
    slug: "admin-reglages",
    label: "D2 · Réglages du pilote",
    render: () => (
      <SettingsScreen
        profile={ADMIN}
        settings={[
          {
            key: "max_order_xof",
            label: "Prix maximum d’un article",
            range: "de 1 000 à 50 000 F",
            value: "50 000 F",
          },
          {
            key: "max_total_locked_xof",
            label: "Total bloqué maximum",
            range: "jusqu’à 1 000 000 F",
            value: "300 000 F",
          },
          {
            key: "max_concurrent_htlcs",
            label: "Paiements en même temps",
            range: "de 2 à 400",
            value: "100",
          },
          {
            key: "pickup_window_sec",
            label: "Délai de ramassage",
            range: "de 30 min à 6 h",
            value: "4 h",
          },
          {
            key: "new_seller_payout_delay_sec",
            label: "Versement différé",
            range: "jusqu’à 24 h",
            value: "2 h",
          },
        ]}
      />
    ),
  },
];
