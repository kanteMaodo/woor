import { BusinessRuleError } from "../errors";
import type { BuyerOrders } from "../ports/buyer-orders";
import type { BuyerSecrets } from "../ports/buyer-secrets";
import { type BuyerCredentials, requireBoundOrder } from "./buyer-access";

/**
 * Donne le code de remise au téléphone lié, une seule fois, quand les deux paiements sont bloqués.
 * Le code n'existe en clair que dans cette réponse ; la base n'en garde que l'empreinte.
 */
export class RevealDeliveryCode {
  constructor(
    private readonly orders: BuyerOrders,
    private readonly secrets: BuyerSecrets,
  ) {}

  async execute(credentials: BuyerCredentials): Promise<{ code: string }> {
    const { orderId, deviceHash } = await requireBoundOrder(this.orders, this.secrets, credentials);

    const code = this.secrets.newDeliveryCode();
    const issued = await this.orders.issueDeliveryCode(
      orderId,
      deviceHash,
      this.secrets.hmacDeliveryCode(code),
    );
    if (!issued) {
      throw new BusinessRuleError(
        "code_unavailable",
        "Le code a déjà été affiché sur ce téléphone, ou les paiements ne sont pas encore bloqués.",
      );
    }
    return { code };
  }
}
