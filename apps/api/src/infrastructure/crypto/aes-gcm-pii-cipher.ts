import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { PiiCipher, SealedText } from "../../application/ports/pii-cipher";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Chiffre les données personnelles en AES-256-GCM.
 * Format stocké : nonce (12 octets) ‖ texte chiffré ‖ étiquette d'authenticité (16 octets).
 * Un texte modifié en base ne se déchiffre pas : GCM le détecte.
 */
export class AesGcmPiiCipher implements PiiCipher {
  constructor(
    private readonly key: Buffer,
    private readonly keyId: number,
  ) {
    if (key.length !== KEY_BYTES) {
      throw new Error(`La clé des données personnelles doit faire ${KEY_BYTES} octets`);
    }
  }

  seal(plaintext: string): SealedText {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, nonce);
    const ciphertext = Buffer.concat([
      nonce,
      cipher.update(plaintext, "utf8"),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    return { ciphertext, keyId: this.keyId };
  }

  open({ ciphertext, keyId }: SealedText): string {
    if (keyId !== this.keyId) {
      throw new Error(`Clé des données personnelles ${keyId} inconnue`);
    }
    const nonce = ciphertext.subarray(0, NONCE_BYTES);
    const tag = ciphertext.subarray(ciphertext.length - TAG_BYTES);
    const body = ciphertext.subarray(NONCE_BYTES, ciphertext.length - TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  }
}
