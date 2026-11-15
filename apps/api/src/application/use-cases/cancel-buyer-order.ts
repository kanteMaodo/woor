import type { OrderState } from "@woor/core";

import type { BuyerOrders } from "../ports/buyer-orders";
import type { BuyerSecrets } from "../ports/buyer-secrets";
import { type BuyerCredentials, requireBoundOrder } from "./buyer-access";

/**
 * Annulation par l'acheteur. Avant le ramassage, il est remboursé de tout ;
 * après, il paie la course. La machine à états de la base tranche.
 */
export class CancelBuyerOrder {
  constructor(
    private readonly orders: BuyerOrders,
    private readonly secrets: BuyerSecrets,
  ) {}

  async execute(credentials: BuyerCredentials): Promise<OrderState> {
    const { orderId } = await requireBoundOrder(this.orders, this.secrets, credentials);
    return this.orders.cancel(orderId);
  }
}
