import { createHash, createHmac, randomBytes } from "node:crypto";

import { hash, verify } from "@node-rs/argon2";

import type { AuthSecrets } from "../../application/ports/auth-secrets";

const KEY_BYTES = 32;
const SESSION_TOKEN_BYTES = 32;

/** Réglages Argon2id recommandés par l'OWASP : 19 Mio de mémoire, 2 passes. */
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/**
 * Secrets de connexion.
 * Le PIN est haché en Argon2id avec un « poivre » : une clé connue de l'API seule.
 * Une fuite de la base ne suffit donc pas pour attaquer les PIN hors ligne.
 */
export class NodeAuthSecrets implements AuthSecrets {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly phoneHmacKey: Buffer,
    private readonly pinPepper: Buffer,
  ) {
    if (phoneHmacKey.length !== KEY_BYTES || pinPepper.length !== KEY_BYTES) {
      throw new Error(`Les clés de connexion doivent faire ${KEY_BYTES} octets`);
    }
  }

  hmacPhone(e164: string): Buffer {
    return createHmac("sha256", this.phoneHmacKey).update(e164, "utf8").digest();
  }

  /** Utilisé à la création d'un compte, et par le script de démonstration. */
  hashPin(pin: string): Promise<string> {
    return hash(pin, { ...ARGON2_OPTIONS, secret: this.pinPepper });
  }

  verifyPin(pinHash: string, pin: string): Promise<boolean> {
    return verify(pinHash, pin, { secret: this.pinPepper });
  }

  async burnPinCheck(pin: string): Promise<void> {
    this.dummyHash ??= this.hashPin(randomBytes(16).toString("hex"));
    await this.verifyPin(await this.dummyHash, pin);
  }

  newSessionToken(): string {
    return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  }

  hashSessionToken(token: string): Buffer {
    return createHash("sha256").update(token, "utf8").digest();
  }
}
