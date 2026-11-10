/**
 * Le code métier n'appelle jamais LND directement : il passe par cette interface.
 * Changer de nœud (Alby Hub, Core Lightning) ne touche alors qu'un adaptateur.
 */
export interface LightningProvider {
  createHoldInvoice(params: CreateHoldInvoiceParams): Promise<{ bolt11: string }>;
  /** Suit une facture. Le nœud envoie d'abord son état actuel, puis chaque changement. */
  subscribeInvoice(paymentHash: Buffer, handlers: InvoiceSubscriptionHandlers): Unsubscribe;
  /** État actuel d'une facture, ou null si le nœud ne la connaît pas. */
  lookupInvoice(paymentHash: Buffer): Promise<InvoiceSnapshot | null>;
  settleHoldInvoice(preimage: Buffer): Promise<void>;
  cancelHoldInvoice(paymentHash: Buffer): Promise<void>;
  payInvoice(params: PayInvoiceParams): Promise<PaymentResult>;
  trackPayment(paymentHash: Buffer): Promise<PaymentStatus>;
  getInfo(): Promise<NodeInfo>;
}

export interface CreateHoldInvoiceParams {
  /** SHA-256 du secret de déblocage, 32 octets. Le secret lui-même ne sort jamais du worker. */
  hash: Buffer;
  amountMsat: bigint;
  expirySec: number;
  cltvDelta: number;
  memo: string;
}

export interface PayInvoiceParams {
  bolt11: string;
  maxFeeMsat: bigint;
}

/** États d'une hold invoice côté nœud : open, puis accepted quand le paiement est bloqué. */
export type HoldInvoiceState = "open" | "accepted" | "settled" | "canceled";

export interface InvoiceSnapshot {
  paymentHash: Buffer;
  state: HoldInvoiceState;
  receivedMsat: bigint;
  /** Hauteur d'expiration la plus basse des HTLC bloqués : c'est elle qui fixe l'échéance réelle. */
  minHtlcExpiryHeight: number | null;
}

export interface InvoiceSubscriptionHandlers {
  onUpdate(snapshot: InvoiceSnapshot): void;
  onError(error: Error): void;
}

export type PaymentResult =
  { status: "succeeded"; preimage: Buffer; feeMsat: bigint } | { status: "failed"; reason: string };

/** not_found : le nœud n'a jamais tenté ce paiement, on peut donc le relancer sans risque. */
export type PaymentStatus = "in_flight" | "succeeded" | "failed" | "not_found";

export interface NodeInfo {
  blockHeight: number;
  synced: boolean;
}

export type Unsubscribe = () => void;
