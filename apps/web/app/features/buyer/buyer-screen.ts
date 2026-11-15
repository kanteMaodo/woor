import type { OrderState } from "@woor/core";

import type { BuyerInvoice, BuyerOrderView, PublicOrderSummary } from "../../lib/api/buyer-schemas";

export type BuyerScreen =
  | { kind: "summary"; summary: PublicOrderSummary }
  | { kind: "open-in-browser" }
  | { kind: "unavailable"; reason: "claimed-elsewhere" | "closed" }
  | { kind: "preparing"; view: BuyerOrderView }
  | { kind: "payment"; view: BuyerOrderView; step: 1 | 2; invoice: BuyerInvoice }
  | { kind: "confirming"; view: BuyerOrderView }
  | { kind: "payment-expired"; view: BuyerOrderView }
  | { kind: "locked"; view: BuyerOrderView }
  | { kind: "tracking"; view: BuyerOrderView }
  | { kind: "delivered"; view: BuyerOrderView }
  | { kind: "closed"; view: BuyerOrderView };

interface ScreenInput {
  /** Commande vue par ce téléphone, s'il y est lié. */
  view: BuyerOrderView | null;
  /** Résumé public, quand le téléphone n'est pas lié. */
  summary: PublicOrderSummary | null;
  inAppBrowser: boolean;
}

/**
 * Choisit l'écran de l'acheteur. Fonction pure : tout se décide à partir des données,
 * l'écran ne contient aucune règle.
 */
export function selectBuyerScreen({ view, summary, inAppBrowser }: ScreenInput): BuyerScreen {
  if (!view) {
    if (!summary || summary.state !== "awaiting_payment") {
      return { kind: "unavailable", reason: "closed" };
    }
    if (summary.claimed) {
      return { kind: "unavailable", reason: "claimed-elsewhere" };
    }
    // Le navigateur d'Instagram ou de TikTok peut effacer le code : on passe d'abord par Chrome.
    return inAppBrowser ? { kind: "open-in-browser" } : { kind: "summary", summary };
  }

  switch (view.state) {
    case "awaiting_payment":
      return paymentScreen(view);
    case "locked":
      return { kind: "locked", view };
    case "in_transit":
    case "disputed":
      return { kind: "tracking", view };
    case "delivered":
    case "paid_out":
      return { kind: "delivered", view };
    case "courier_paid":
    case "refunded":
    case "expired":
      return { kind: "closed", view };
  }
}

/** Les deux factures se paient l'une après l'autre : la course d'abord, puis l'article. */
function paymentScreen(view: BuyerOrderView): BuyerScreen {
  const fee = view.invoices.find((invoice) => invoice.kind === "delivery_fee");
  const item = view.invoices.find((invoice) => invoice.kind === "item");

  if (!fee || !item) {
    return { kind: "preparing", view };
  }
  if (fee.state === "cancelled" || item.state === "cancelled") {
    return { kind: "payment-expired", view };
  }
  if (fee.state === "open") {
    return { kind: "payment", view, step: 1, invoice: fee };
  }
  if (item.state === "open") {
    return { kind: "payment", view, step: 2, invoice: item };
  }
  return { kind: "confirming", view };
}

/** États où la page doit se rafraîchir seule pour suivre la commande. */
export function shouldPoll(state: OrderState | undefined): boolean {
  return (
    state === "awaiting_payment" ||
    state === "locked" ||
    state === "in_transit" ||
    state === "disputed" ||
    state === "delivered"
  );
}
