import { NotFoundError } from "../errors";
import type { BuyerOrders } from "../ports/buyer-orders";
import type { BuyerSecrets } from "../ports/buyer-secrets";

/** Identité de l'acheteur dans une requête : le jeton du lien et, s'il existe, celui du téléphone. */
export interface BuyerCredentials {
  orderToken: string;
  deviceToken: string | null;
}

export interface BoundOrder {
  orderId: string;
  tokenHash: Buffer;
  deviceHash: Buffer;
}

/**
 * Retrouve la commande liée à ce téléphone, ou échoue en « introuvable ».
 * Point d'entrée commun à toutes les actions de l'acheteur.
 */
export async function requireBoundOrder(
  orders: BuyerOrders,
  secrets: BuyerSecrets,
  credentials: BuyerCredentials,
): Promise<BoundOrder> {
  if (!credentials.deviceToken) {
    throw new NotFoundError();
  }
  const tokenHash = secrets.hashOrderToken(credentials.orderToken);
  const deviceHash = secrets.hashDeviceToken(credentials.deviceToken);
  const orderId = await orders.findBoundOrderId(tokenHash, deviceHash);
  if (!orderId) {
    throw new NotFoundError();
  }
  return { orderId, tokenHash, deviceHash };
}
