import type { InvoiceKind, InvoiceState, OrderState } from "@woor/core";

import type { SealedPreimage } from "./preimage-vault";

export interface OrderToInvoice {
  id: string;
  state: OrderState;
  itemPriceXof: number;
  deliveryFeeXof: number;
}

export interface NewInvoice {
  orderId: string;
  kind: InvoiceKind;
  paymentHash: Buffer;
  amountMsat: bigint;
  amountXof: number;
  fxQuoteId: string;
  bolt11: string;
  expiresAt: Date;
  cltvDelta: number;
  sealedPreimage: SealedPreimage;
}

export interface StoredInvoice {
  id: string;
  orderId: string;
  kind: InvoiceKind;
  state: InvoiceState;
  paymentHash: Buffer;
}

export interface AcceptedPayment {
  acceptHeight: number;
  minHtlcExpiryHeight: number | null;
}

/**
 * Accès aux factures. Chaque méthode qui change un état ne le fait que depuis
 * les états attendus : appelée deux fois, elle ne change rien la seconde fois.
 */
export interface InvoiceRepository {
  findOrderToInvoice(orderId: string): Promise<OrderToInvoice | null>;
  listInvoiceKinds(orderId: string): Promise<InvoiceKind[]>;
  /** Enregistre la facture, son secret chiffré et l'échéance de paiement, en une transaction. */
  save(invoice: NewInvoice): Promise<void>;

  findByOrder(orderId: string, kind: InvoiceKind): Promise<StoredInvoice | null>;
  loadSealedPreimage(invoiceId: string): Promise<SealedPreimage>;
  listWatchedPaymentHashes(): Promise<Buffer[]>;

  markAccepted(paymentHash: Buffer, payment: AcceptedPayment): Promise<boolean>;
  /** Écrit l'intention de régler avant d'appeler le nœud, pour reprendre après une panne. */
  markSettling(invoiceId: string): Promise<boolean>;
  markSettled(paymentHash: Buffer): Promise<boolean>;
  /** Écrit l'intention d'annuler avant d'appeler le nœud. */
  markCancelling(invoiceId: string): Promise<boolean>;
  markCancelled(paymentHash: Buffer, reason: string): Promise<boolean>;
}
