import { NotFoundError } from "../errors";
import type { BuyerOrders } from "../ports/buyer-orders";
import type { BuyerSecrets } from "../ports/buyer-secrets";
import type { BuyerCredentials } from "./buyer-access";

export interface ClaimResult {
  /** Jeton du téléphone : nouveau s'il n'en avait pas, sinon le même. */
  deviceToken: string;
}

/**
 * « Je commande » : le premier téléphone qui appuie est lié à la commande.
 * Idempotent pour ce téléphone ; un autre téléphone reçoit une erreur métier.
 */
export class ClaimOrder {
  constructor(
    private readonly orders: BuyerOrders,
    private readonly secrets: BuyerSecrets,
  ) {}

  async execute(credentials: BuyerCredentials): Promise<ClaimResult> {
    const deviceToken = credentials.deviceToken ?? this.secrets.newDeviceToken();
    const orderId = await this.orders.claim(
      this.secrets.hashOrderToken(credentials.orderToken),
      this.secrets.hashDeviceToken(deviceToken),
    );
    if (!orderId) {
      throw new NotFoundError();
    }
    return { deviceToken };
  }
}
