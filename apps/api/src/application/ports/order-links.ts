/** Jeton du lien partagé à l'acheteur : la base n'en garde que l'empreinte. */
export interface OrderLinks {
  /** 128 bits aléatoires en base64url (22 caractères). */
  newOrderToken(): string;
  hashOrderToken(token: string): Buffer;
}

/** Empreinte du code de remise, partagée par l'acheteur (qui le reçoit) et le livreur (qui le saisit). */
export interface DeliveryCodeHasher {
  /** HMAC-SHA256 du code avec une clé secrète : le code ne peut pas être retrouvé depuis la base. */
  hmacDeliveryCode(code: string): Buffer;
}
