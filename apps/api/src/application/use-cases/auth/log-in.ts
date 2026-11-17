import { isValidPin, toSenegalE164 } from "@woor/core";

import { AuthenticationError } from "../../errors";
import type { Accounts } from "../../ports/accounts";
import type { AuthSecrets } from "../../ports/auth-secrets";

export interface LogInInput {
  phone: string;
  pin: string;
}

export interface LogInResult {
  sessionToken: string;
  expiresAt: Date;
}

const BAD_CREDENTIALS = new AuthenticationError("bad_credentials", "Numéro ou PIN incorrect.");

const OUTCOME_ERRORS: Record<string, AuthenticationError> = {
  locked: new AuthenticationError("pin_locked", "Trop d'essais. Réessayez dans 15 minutes."),
  account_suspended: new AuthenticationError("account_suspended", "Ce compte est suspendu."),
};

/**
 * Connexion par numéro et PIN de secours.
 * La base compte les essais et bloque le PIN ; l'API ne fait que vérifier le hachage.
 */
export class LogIn {
  constructor(
    private readonly accounts: Accounts,
    private readonly secrets: AuthSecrets,
  ) {}

  async execute({ phone, pin }: LogInInput): Promise<LogInResult> {
    const e164 = toSenegalE164(phone);
    if (!e164 || !isValidPin(pin)) {
      throw BAD_CREDENTIALS;
    }

    const candidate = await this.accounts.findLoginCandidate(this.secrets.hmacPhone(e164));
    if (!candidate?.pinCredentialId || !candidate.pinHash) {
      await this.secrets.burnPinCheck(pin);
      throw BAD_CREDENTIALS;
    }

    const valid = await this.secrets.verifyPin(candidate.pinHash, pin);
    const outcome = await this.accounts.recordLogin(candidate.pinCredentialId, valid);
    if (outcome !== "ok") {
      throw OUTCOME_ERRORS[outcome] ?? BAD_CREDENTIALS;
    }

    const sessionToken = this.secrets.newSessionToken();
    const { expiresAt } = await this.accounts.openSession(
      candidate.userId,
      this.secrets.hashSessionToken(sessionToken),
    );
    return { sessionToken, expiresAt };
  }
}
