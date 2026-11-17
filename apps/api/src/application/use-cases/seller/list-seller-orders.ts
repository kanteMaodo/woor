import type { Actor } from "../../actor";
import type { PiiCipher } from "../../ports/pii-cipher";
import type { SellerOrders } from "../../ports/seller-orders";
import { type SellerOrderView, toSellerOrderView } from "./seller-order-view";

/** GET /v1/seller/orders : les commandes de la vendeuse, les plus récentes d'abord. */
export class ListSellerOrders {
  constructor(
    private readonly orders: SellerOrders,
    private readonly cipher: PiiCipher,
  ) {}

  async execute(actor: Actor): Promise<SellerOrderView[]> {
    const records = await this.orders.list(actor);
    return records.map((record) => toSellerOrderView(this.cipher, record));
  }
}
