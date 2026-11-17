import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

import type { BuyerSecrets } from "../../application/ports/buyer-secrets";
import type { OrderLinks } from "../../application/ports/order-links";

const ORDER_TOKEN_BYTES = 16;
const DEVICE_TOKEN_BYTES = 32;
const HMAC_KEY_BYTES = 32;

/** Secrets du lien et de l'acheteur. Les jetons ne sont jamais stockés : seulement leur SHA-256. */
export class NodeBuyerSecrets implements BuyerSecrets, OrderLinks {
  constructor(private readonly codeHmacKey: Buffer) {
    if (codeHmacKey.length !== HMAC_KEY_BYTES) {
      throw new Error(`La clé HMAC des codes doit faire ${HMAC_KEY_BYTES} octets`);
    }
  }

  newOrderToken(): string {
    return randomBytes(ORDER_TOKEN_BYTES).toString("base64url");
  }

  hashOrderToken(token: string): Buffer {
    return sha256(token);
  }

  newDeviceToken(): string {
    return randomBytes(DEVICE_TOKEN_BYTES).toString("base64url");
  }

  hashDeviceToken(token: string): Buffer {
    return sha256(token);
  }

  newDeliveryCode(): string {
    // randomInt tire uniformément, sans le biais d'un modulo.
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  hmacDeliveryCode(code: string): Buffer {
    return createHmac("sha256", this.codeHmacKey).update(code, "utf8").digest();
  }
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
