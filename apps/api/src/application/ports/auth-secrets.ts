/** Empreintes et vérifications liées à la connexion. Aucun secret n'est stocké en clair. */
export interface AuthSecrets {
  /** HMAC du numéro E.164 : la base retrouve le compte sans connaître le numéro. */
  hmacPhone(e164: string): Buffer;
  verifyPin(pinHash: string, pin: string): Promise<boolean>;
  /**
   * Vérification factice, au même coût qu'une vraie : un numéro inconnu répond
   * aussi lentement qu'un numéro connu, on ne peut donc pas deviner qui a un compte.
   */
  burnPinCheck(pin: string): Promise<void>;
  /** Jeton de session aléatoire de 256 bits, posé dans un cookie HttpOnly. */
  newSessionToken(): string;
  hashSessionToken(token: string): Buffer;
}
