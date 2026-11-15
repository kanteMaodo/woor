import { INVOICE_KINDS, INVOICE_STATES, ORDER_STATES } from "@woor/core";
import { z } from "zod";

/** Contrat des réponses de l'API côté acheteur. Validé à chaque appel par le serveur web. */
export const PublicOrderSummarySchema = z.object({
  sellerName: z.string(),
  sellerSuccessfulDeliveries: z.number(),
  itemLabel: z.string(),
  itemPriceXof: z.number(),
  deliveryFeeXof: z.number(),
  totalXof: z.number(),
  state: z.enum(ORDER_STATES),
  claimed: z.boolean(),
});

export const BuyerInvoiceSchema = z.object({
  kind: z.enum(INVOICE_KINDS),
  state: z.enum(INVOICE_STATES),
  bolt11: z.string(),
  amountXof: z.number(),
  amountSats: z.number(),
  expiresAt: z.string(),
});

const timestamp = z.string().nullable();

export const BuyerOrderViewSchema = PublicOrderSummarySchema.extend({
  courierFirstName: z.string().nullable(),
  courierPhoneLast2: z.string().nullable(),
  payDeadline: timestamp,
  lockedAt: timestamp,
  pickedUpAt: timestamp,
  arrivedAt: timestamp,
  deliveredAt: timestamp,
  closedAt: timestamp,
  hardStopAt: timestamp,
  refusalDeclaredAt: timestamp,
  noShowDeclaredAt: timestamp,
  contestDeadline: timestamp,
  codeIssued: z.boolean(),
  invoices: z.array(BuyerInvoiceSchema),
});

export type PublicOrderSummary = z.infer<typeof PublicOrderSummarySchema>;
export type BuyerInvoice = z.infer<typeof BuyerInvoiceSchema>;
export type BuyerOrderView = z.infer<typeof BuyerOrderViewSchema>;
