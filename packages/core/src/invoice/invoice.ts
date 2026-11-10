/**
 * Miroir de l'énumération SQL woor.invoice_kind.
 * Ordre de paiement : la course (A) d'abord, puis l'article (B).
 */
export const INVOICE_KINDS = ["delivery_fee", "item"] as const;

export type InvoiceKind = (typeof INVOICE_KINDS)[number];

/** Miroir de l'énumération SQL woor.invoice_state. */
export const INVOICE_STATES = [
  "open",
  "accepted",
  "settling",
  "settled",
  "cancelling",
  "cancelled",
] as const;

export type InvoiceState = (typeof INVOICE_STATES)[number];

/** États que le service de paiements doit suivre auprès du nœud. */
export const WATCHED_INVOICE_STATES = [
  "open",
  "accepted",
  "settling",
  "cancelling",
] as const satisfies readonly InvoiceState[];

export function isFinalInvoiceState(state: InvoiceState): boolean {
  return state === "settled" || state === "cancelled";
}
