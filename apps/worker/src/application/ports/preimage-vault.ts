/** Secret de déblocage chiffré, tel qu'il est rangé dans woor_secret.invoice_preimages. */
export interface SealedPreimage {
  ciphertext: Buffer;
  nonce: Buffer;
  keyId: number;
}

export interface PreimageWithHash {
  preimage: Buffer;
  paymentHash: Buffer;
}

/** Fabrique, chiffre et déchiffre les secrets de déblocage. Seul le worker en détient la clé. */
export interface PreimageVault {
  generate(): PreimageWithHash;
  seal(secret: PreimageWithHash): SealedPreimage;
  /** Déchiffre et vérifie que le secret correspond bien à l'empreinte attendue. */
  open(sealed: SealedPreimage, paymentHash: Buffer): Buffer;
}
