/** Texte chiffré et identifiant de la clé, pour pouvoir changer de clé plus tard. */
export interface SealedText {
  ciphertext: Buffer;
  keyId: number;
}

/** Chiffrement des données personnelles (adresse, téléphone) avant leur entrée en base. */
export interface PiiCipher {
  seal(plaintext: string): SealedText;
  open(sealed: SealedText): string;
}
