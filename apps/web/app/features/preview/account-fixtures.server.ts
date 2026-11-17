import type { Delivery, LinkedCourier, Profile, SellerOrder } from "../../lib/api/account-schemas";
import type { SharedOrder } from "../seller/screens/share-link-screen";

/** Écrans fictifs de la vendeuse et du livreur, pour l'aperçu en développement. */
export type AccountPreview =
  | { kind: "login"; slug: string; label: string; error: string | null }
  | { kind: "seller-orders"; slug: string; label: string; profile: Profile; orders: SellerOrder[] }
  | {
      kind: "new-order";
      slug: string;
      label: string;
      profile: Profile;
      couriers: LinkedCourier[];
    }
  | { kind: "share-link"; slug: string; label: string; profile: Profile; order: SharedOrder }
  | { kind: "seller-order"; slug: string; label: string; profile: Profile; order: SellerOrder }
  | { kind: "deliveries"; slug: string; label: string; profile: Profile; deliveries: Delivery[] }
  | {
      kind: "delivery";
      slug: string;
      label: string;
      profile: Profile;
      delivery: Delivery;
      error: string | null;
    };

const SELLER: Profile = { displayName: "Awa Couture", role: "seller" };
const COURIER: Profile = { displayName: "Moussa Diop", role: "courier" };

export function buildAccountPreviews(now: Date): AccountPreview[] {
  const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  const order = (overrides: Partial<SellerOrder>): SellerOrder => ({
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
  });

  const inTransit = order({
    state: "in_transit",
    claimedAt: at(-66),
    lockedAt: at(-63),
    pickedUpAt: at(-34),
  });
  const orders = [
    inTransit,
    order({
      id: "0190a1b2-0000-7000-8000-000000000002",
      itemLabel: "Sac en cuir",
      itemPriceXof: 15_000,
      totalXof: 16_500,
      state: "locked",
      neighborhood: "Liberté 6",
      claimedAt: at(-20),
      lockedAt: at(-18),
    }),
    order({
      id: "0190a1b2-0000-7000-8000-000000000003",
      itemLabel: "Boubou brodé",
      itemPriceXof: 9_000,
      totalXof: 10_500,
      neighborhood: "Médina",
    }),
  ];

  const delivery = (overrides: Partial<Delivery>): Delivery => ({
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
  });
  const toPickUp = delivery({
    id: "0190a1b2-0000-7000-8000-000000000002",
    itemLabel: "Sac en cuir",
    state: "locked",
    neighborhood: "Liberté 6",
    landmark: "Immeuble jaune, 2e étage",
    pickedUpAt: null,
  });

  return [
    { kind: "login", slug: "connexion", label: "O2 · Connexion", error: null },
    {
      kind: "login",
      slug: "connexion-erreur",
      label: "O2 · Connexion refusée",
      error: "Numéro ou PIN incorrect.",
    },
    {
      kind: "seller-orders",
      slug: "vendeuse",
      label: "S1 · Mes commandes",
      profile: SELLER,
      orders,
    },
    {
      kind: "new-order",
      slug: "vendeuse-nouvelle",
      label: "S2 · Nouvelle commande",
      profile: SELLER,
      couriers: [
        {
          id: "0190a1b2-0000-7000-8000-0000000000c1",
          displayName: "Moussa Diop",
          phoneLast2: "02",
        },
      ],
    },
    {
      kind: "share-link",
      slug: "vendeuse-lien",
      label: "S3 · Partager le lien",
      profile: SELLER,
      order: {
        orderId: inTransit.id,
        itemLabel: inTransit.itemLabel,
        totalXof: inTransit.totalXof,
        link: "http://localhost:5173/o/7K3Qx9mPa2bC4dE5fG6hIj",
      },
    },
    {
      kind: "seller-order",
      slug: "vendeuse-commande",
      label: "S5 · Détail d'une commande",
      profile: SELLER,
      order: inTransit,
    },
    {
      kind: "deliveries",
      slug: "livreur",
      label: "C1 · Mes courses",
      profile: COURIER,
      deliveries: [
        toPickUp,
        delivery({}),
        delivery({
          id: "0190a1b2-0000-7000-8000-000000000004",
          itemLabel: "Sandales 39",
          state: "paid_out",
          neighborhood: "Point E",
          deliveredAt: at(-140),
        }),
      ],
    },
    {
      kind: "delivery",
      slug: "livreur-ramassage",
      label: "C3 · Course à ramasser",
      profile: COURIER,
      delivery: toPickUp,
      error: null,
    },
    {
      kind: "delivery",
      slug: "livreur-code",
      label: "C4 · Saisir le code",
      profile: COURIER,
      delivery: delivery({ codeAttemptsLeft: 4 }),
      error: "Code faux. Il reste 4 essai(s).",
    },
    {
      kind: "delivery",
      slug: "livreur-confirme",
      label: "C5 · Paiement confirmé",
      profile: COURIER,
      delivery: delivery({ state: "delivered", deliveredAt: at(-1) }),
      error: null,
    },
  ];
}
