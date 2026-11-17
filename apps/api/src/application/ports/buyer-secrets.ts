import type { DeliveryCodeHasher } from "./order-links";

/** Fabrique et empreinte des secrets de l'acheteur. Aucun n'est stocké en clair. */
export interface BuyerSecrets extends DeliveryCodeHasher {
  /** SHA-256 du jeton du lien : c'est la seule forme connue de la base. */
  hashOrderToken(token: string): Buffer;
  /** Jeton aléatoire de 256 bits, posé dans un cookie HttpOnly du téléphone. */
  newDeviceToken(): string;
  hashDeviceToken(token: string): Buffer;
  /** Six chiffres tirés uniformément. */
  newDeliveryCode(): string;
}
