import type { BuyerOrders, InvoiceRequestStatus } from "../ports/buyer-orders";
import type { BuyerSecrets } from "../ports/buyer-secrets";
import { type BuyerCredentials, requireBoundOrder } from "./buyer-access";

/**
 * Demande les factures A et B. La base vérifie l'interrupteur et les plafonds,
 * puis confie la création au service de paiements. Idempotent.
 */
export class RequestInvoices {
  constructor(
    private readonly orders: BuyerOrders,
    private readonly secrets: BuyerSecrets,
  ) {}

  async execute(credentials: BuyerCredentials): Promise<InvoiceRequestStatus> {
    const { orderId } = await requireBoundOrder(this.orders, this.secrets, credentials);
    return this.orders.requestInvoices(orderId);
  }
}
