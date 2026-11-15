import type { BuyerOrders, BuyerOrderView } from "../ports/buyer-orders";
import type { BuyerSecrets } from "../ports/buyer-secrets";
import { type BuyerCredentials, requireBoundOrder } from "./buyer-access";

/** GET /v1/o/:token/me : la commande telle que la voit le téléphone lié. */
export class GetBuyerOrder {
  constructor(
    private readonly orders: BuyerOrders,
    private readonly secrets: BuyerSecrets,
  ) {}

  async execute(credentials: BuyerCredentials): Promise<BuyerOrderView> {
    const { orderId, tokenHash } = await requireBoundOrder(this.orders, this.secrets, credentials);
    return this.orders.getView(orderId, tokenHash);
  }
}
