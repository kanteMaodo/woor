import type { Actor } from "../../actor";
import { NotFoundError } from "../../errors";
import type { PiiCipher } from "../../ports/pii-cipher";
import type { SellerOrders } from "../../ports/seller-orders";
import { type SellerOrderView, toSellerOrderView } from "./seller-order-view";

/** GET /v1/seller/orders/:id : une commande de la vendeuse, ou « introuvable ». */
export class GetSellerOrder {
  constructor(
    private readonly orders: SellerOrders,
    private readonly cipher: PiiCipher,
  ) {}

  async execute(actor: Actor, orderId: string): Promise<SellerOrderView> {
    const record = await this.orders.find(actor, orderId);
    if (!record) {
      throw new NotFoundError();
    }
    return toSellerOrderView(this.cipher, record);
  }
}
