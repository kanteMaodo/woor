import type { InvoiceKind, InvoiceState, OrderState } from "@woor/core";

/** Ce que voit quiconque a le lien : ni adresse, ni téléphone, ni code. */
export interface PublicOrderSummary {
  sellerName: string;
  sellerSuccessfulDeliveries: number;
  itemLabel: string;
  itemPriceXof: number;
  deliveryFeeXof: number;
  totalXof: number;
  state: OrderState;
  claimed: boolean;
}

export interface BuyerInvoice {
  kind: InvoiceKind;
  state: InvoiceState;
  bolt11: string;
  amountXof: number;
  amountSats: number;
  expiresAt: string;
}

/** Ce que voit le téléphone lié à la commande. */
export interface BuyerOrderView extends PublicOrderSummary {
  courierFirstName: string | null;
  courierPhoneLast2: string | null;
  payDeadline: string | null;
  lockedAt: string | null;
  pickedUpAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  hardStopAt: string | null;
  refusalDeclaredAt: string | null;
  noShowDeclaredAt: string | null;
  contestDeadline: string | null;
  codeIssued: boolean;
  invoices: BuyerInvoice[];
}

export type InvoiceRequestStatus = "requested" | "pending" | "exists";

/**
 * Accès aux commandes côté acheteur. Les méthodes qui prennent un orderId s'exécutent
 * avec le contexte « acheteur de cette commande » : la base vérifie elle-même le droit.
 */
export interface BuyerOrders {
  findPublicSummary(tokenHash: Buffer): Promise<PublicOrderSummary | null>;
  /** Lie le téléphone à la commande. null si la commande n'existe pas ou n'est plus disponible. */
  claim(tokenHash: Buffer, deviceHash: Buffer): Promise<string | null>;
  /** Commande liée à ce téléphone, ou null. */
  findBoundOrderId(tokenHash: Buffer, deviceHash: Buffer): Promise<string | null>;
  getView(orderId: string, tokenHash: Buffer): Promise<BuyerOrderView>;
  requestInvoices(orderId: string): Promise<InvoiceRequestStatus>;
  /** Enregistre l'empreinte du code. false si le code a déjà été donné ou n'est pas encore dû. */
  issueDeliveryCode(orderId: string, deviceHash: Buffer, codeHmac: Buffer): Promise<boolean>;
  cancel(orderId: string): Promise<OrderState>;
}
