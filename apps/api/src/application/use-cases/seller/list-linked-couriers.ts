import type { Actor } from "../../actor";
import type { LinkedCourier, SellerOrders } from "../../ports/seller-orders";

/** Les livreurs avec qui la vendeuse travaille : seuls eux peuvent porter ses commandes. */
export class ListLinkedCouriers {
  constructor(private readonly orders: SellerOrders) {}

  execute(actor: Actor): Promise<LinkedCourier[]> {
    return this.orders.listCouriers(actor);
  }
}
