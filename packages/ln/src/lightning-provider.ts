/**
 * Le code métier n'appelle jamais LND directement : il passe par cette interface.
 * Changer de nœud (Alby Hub, Core Lightning) ne touche alors qu'un adaptateur.
 */
export interface LightningProvider {
  createHoldInvoice(params: CreateHoldInvoiceParams): Promise<{ bolt11: string }>;
  subscribeInvoice(paymentHash: Buffer, onEvent: (event: InvoiceEvent) => void): Unsubscribe;
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

/** États LND d'une hold invoice : OPEN, puis ACCEPTED quand le paiement est bloqué. */
export type HoldInvoiceState = "open" | "accepted" | "settled" | "canceled";

export interface InvoiceEvent {
  paymentHash: Buffer;
  state: HoldInvoiceState;
  amountMsat: bigint;
  /** Hauteur d'expiration la plus basse des HTLC reçus : c'est elle qui fixe l'échéance réelle. */
  minHtlcExpiryHeight: number | null;
}

export type PaymentResult =
  { status: "succeeded"; preimage: Buffer; feeMsat: bigint } | { status: "failed"; reason: string };

export type PaymentStatus = "in_flight" | "succeeded" | "failed" | "unknown";

export interface NodeInfo {
  blockHeight: number;
  synced: boolean;
}

export type Unsubscribe = () => void;
