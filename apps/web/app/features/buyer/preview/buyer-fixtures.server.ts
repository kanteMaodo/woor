import type {
  BuyerInvoice,
  BuyerOrderView,
  PublicOrderSummary,
} from "../../../lib/api/buyer-schemas";

/**
 * Commandes fictives pour l’aperçu des écrans, en développement seulement.
 * Chaque cas passe par le vrai selectBuyerScreen : l’aperçu montre ce que l’acheteur verrait.
 */
export interface BuyerPreview {
  slug: string;
  label: string;
  view: BuyerOrderView | null;
  summary: PublicOrderSummary | null;
  inAppBrowser: boolean;
  revealedCode: string | null;
  reporting: boolean;
}

const FAKE_BOLT11 =
  "lnbcrt42350n1pnwoorpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5" +
  "vdhkven9v5sxyetpdeessp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs9qrsg" +
  "q3cqpjrzjqwfn3p9278ttzzpe0e00uhyxhned3j5d9acqak5emwfpflp8z2cngqqqqqqqqqqqqqqqqqqqq";

const SUMMARY: PublicOrderSummary = {
  sellerName: "Awa Couture",
  sellerSuccessfulDeliveries: 37,
  itemLabel: "Robe wax, taille M",
  itemPriceXof: 25_000,
  deliveryFeeXof: 2_000,
  totalXof: 27_000,
  state: "awaiting_payment",
  claimed: false,
};

export function buildBuyerPreviews(now: Date): BuyerPreview[] {
  const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  const invoice = (kind: BuyerInvoice["kind"], state: BuyerInvoice["state"]): BuyerInvoice => {
    const xof = kind === "delivery_fee" ? SUMMARY.deliveryFeeXof : SUMMARY.itemPriceXof;
    return {
      kind,
      state,
      bolt11: FAKE_BOLT11,
      amountXof: xof,
      amountSats: xof * 2,
      expiresAt: at(14),
    };
  };

  const base: BuyerOrderView = {
    ...SUMMARY,
    claimed: true,
    courierFirstName: null,
    courierPhoneLast2: null,
    payDeadline: at(14),
    lockedAt: null,
    pickedUpAt: null,
    arrivedAt: null,
    deliveredAt: null,
    closedAt: null,
    hardStopAt: null,
    refusalDeclaredAt: null,
    noShowDeclaredAt: null,
    contestDeadline: null,
    codeIssued: false,
    invoices: [],
  };

  const locked: BuyerOrderView = {
    ...base,
    state: "locked",
    lockedAt: at(-3),
    hardStopAt: at(48 * 60),
    invoices: [invoice("delivery_fee", "accepted"), invoice("item", "accepted")],
  };

  const inTransit: BuyerOrderView = {
    ...locked,
    state: "in_transit",
    codeIssued: true,
    courierFirstName: "Moussa",
    courierPhoneLast2: "42",
    pickedUpAt: at(-25),
  };

  const preview = (
    slug: string,
    label: string,
    view: BuyerOrderView | null,
    options: Partial<
      Pick<BuyerPreview, "summary" | "inAppBrowser" | "revealedCode" | "reporting">
    > = {},
  ): BuyerPreview => ({
    slug,
    label,
    view,
    summary: options.summary ?? null,
    inAppBrowser: options.inAppBrowser ?? false,
    revealedCode: options.revealedCode ?? null,
    reporting: options.reporting ?? false,
  });

  return [
    preview("resume", "B1 · Résumé de la commande", null, { summary: SUMMARY }),
    preview("chrome", "B2 · Ouvrir dans Chrome", null, { summary: SUMMARY, inAppBrowser: true }),
    preview("deja-prise", "Commande prise par un autre téléphone", null, {
      summary: { ...SUMMARY, claimed: true },
    }),
    preview("preparation", "Préparation des factures", base),
    preview("paiement-course", "B3 · Paiement de la course", {
      ...base,
      invoices: [invoice("delivery_fee", "open"), invoice("item", "open")],
    }),
    preview("paiement-article", "B4 · Paiement de l’article", {
      ...base,
      invoices: [invoice("delivery_fee", "accepted"), invoice("item", "open")],
    }),
    preview("confirmation", "Confirmation du paiement", {
      ...base,
      invoices: [invoice("delivery_fee", "accepted"), invoice("item", "accepted")],
    }),
    preview("paiement-expire", "Paiement expiré", {
      ...base,
      invoices: [invoice("delivery_fee", "cancelled"), invoice("item", "cancelled")],
    }),
    preview("bloque", "B5 · Argent bloqué, code à révéler", locked),
    preview(
      "code",
      "B6 · Code de remise affiché",
      { ...locked, codeIssued: true },
      {
        revealedCode: "482913",
      },
    ),
    preview("en-route", "B7 · Livreur en route", inTransit),
    preview("arrive", "B7 · Livreur arrivé", { ...inTransit, arrivedAt: at(-1) }),
    preview("refus", "B8 · Refus déclaré à la porte", {
      ...inTransit,
      arrivedAt: at(-6),
      refusalDeclaredAt: at(-2),
      contestDeadline: at(28),
    }),
    preview("signaler", "B9 · Signaler un problème", inTransit, { reporting: true }),
    preview("litige", "B7 · Litige en cours", { ...inTransit, state: "disputed" }),
    preview("remis", "B10 · Commande remise", {
      ...inTransit,
      state: "delivered",
      deliveredAt: at(-4),
    }),
    preview("rembourse", "B11 · Remboursée", { ...locked, state: "refunded", closedAt: at(-10) }),
    preview("expire", "B11 · Expirée", { ...base, state: "expired", closedAt: at(-30) }),
    preview("course-payee", "B11 · Course payée, article rendu", {
      ...inTransit,
      state: "courier_paid",
      closedAt: at(-5),
    }),
  ];
}
