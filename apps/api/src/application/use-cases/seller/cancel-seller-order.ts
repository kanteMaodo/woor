import type { OrderState } from "@woor/core";

import type { Actor } from "../../actor";
import type { SellerOrders } from "../../ports/seller-orders";

/** La vendeuse annule avant le ramassage ; l'acheteur est remboursé en entier. */
export class CancelSellerOrder {
  constructor(private readonly orders: SellerOrders) {}

  execute(actor: Actor, orderId: string): Promise<OrderState> {
    return this.orders.cancel(actor, orderId);
  }
}
