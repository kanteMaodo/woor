import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type {
  PreimageVault,
  PreimageWithHash,
  SealedPreimage,
} from "../../application/ports/preimage-vault";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const PREIMAGE_BYTES = 32;

/**
 * Chiffre les secrets de déblocage en AES-256-GCM.
 *
 * L'empreinte du paiement sert de donnée associée : un secret chiffré déplacé sur une
 * autre facture ne se déchiffre pas. Plusieurs clés peuvent coexister pour la rotation :
 * on chiffre avec la clé active, on déchiffre avec celle dont l'identifiant est stocké.
 */
export class AesGcmPreimageVault implements PreimageVault {
  constructor(
    private readonly keys: ReadonlyMap<number, Buffer>,
    private readonly activeKeyId: number,
  ) {
    for (const [id, key] of keys) {
      if (key.length !== KEY_BYTES) {
        throw new Error(`La clé de chiffrement ${id} doit faire ${KEY_BYTES} octets`);
      }
    }
    if (!keys.has(activeKeyId)) {
      throw new Error(`Clé de chiffrement active ${activeKeyId} absente`);
    }
  }

  generate(): PreimageWithHash {
    const preimage = randomBytes(PREIMAGE_BYTES);
    return { preimage, paymentHash: sha256(preimage) };
  }

  seal({ preimage, paymentHash }: PreimageWithHash): SealedPreimage {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key(this.activeKeyId), nonce);
    cipher.setAAD(paymentHash);
    const ciphertext = Buffer.concat([
      cipher.update(preimage),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    return { ciphertext, nonce, keyId: this.activeKeyId };
  }

  open(sealed: SealedPreimage, paymentHash: Buffer): Buffer {
    const tag = sealed.ciphertext.subarray(-TAG_BYTES);
    const body = sealed.ciphertext.subarray(0, -TAG_BYTES);

    const decipher = createDecipheriv(ALGORITHM, this.key(sealed.keyId), sealed.nonce);
    decipher.setAAD(paymentHash);
    decipher.setAuthTag(tag);
    const preimage = Buffer.concat([decipher.update(body), decipher.final()]);

    const expected = sha256(preimage);
    if (expected.length !== paymentHash.length || !timingSafeEqual(expected, paymentHash)) {
      throw new Error("Le secret déchiffré ne correspond pas à la facture");
    }
    return preimage;
  }

  private key(keyId: number): Buffer {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Clé de chiffrement ${keyId} inconnue`);
    }
    return key;
  }
}

/**
 * Lit la liste des clés au format "1:base64,2:base64".
 * Générer une clé : node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function parsePreimageKeys(value: string): Map<number, Buffer> {
  const keys = new Map<number, Buffer>();
  for (const entry of value.split(",")) {
    const [rawId, rawKey] = entry.trim().split(":");
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1 || id > 32_767 || !rawKey) {
      throw new Error("PREIMAGE_KEYS attend le format 1:base64,2:base64");
    }
    keys.set(id, Buffer.from(rawKey, "base64"));
  }
  return keys;
}

function sha256(data: Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}
