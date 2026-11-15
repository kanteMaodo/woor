import { NotFoundError } from "../errors";
import type { BuyerOrders, PublicOrderSummary } from "../ports/buyer-orders";
import type { BuyerSecrets } from "../ports/buyer-secrets";

/** GET /v1/o/:token : lecture seule, appelée aussi par les aperçus de lien des messageries. */
export class GetPublicOrder {
  constructor(
    private readonly orders: BuyerOrders,
    private readonly secrets: BuyerSecrets,
  ) {}

  async execute(orderToken: string): Promise<PublicOrderSummary> {
    const summary = await this.orders.findPublicSummary(this.secrets.hashOrderToken(orderToken));
    if (!summary) {
      throw new NotFoundError();
    }
    return summary;
  }
}
