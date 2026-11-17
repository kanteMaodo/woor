import type { AccountRole } from "@woor/core";

import type { Actor } from "../actor";

/** Compte trouvé par son numéro, avec son PIN de secours s'il en a un. */
export interface LoginCandidate {
  userId: string;
  pinCredentialId: string | null;
  pinHash: string | null;
}

/** Verdict de la base après une tentative : ok, failed, locked, account_suspended… */
export type LoginOutcome = string;

export interface AccountProfile {
  displayName: string;
  role: AccountRole;
}

/** Comptes et sessions. Les fonctions du schéma tiennent le compte des essais et des blocages. */
export interface Accounts {
  findLoginCandidate(phoneHmac: Buffer): Promise<LoginCandidate | null>;
  recordLogin(credentialId: string, success: boolean): Promise<LoginOutcome>;
  openSession(userId: string, tokenHash: Buffer): Promise<{ expiresAt: Date }>;
  /** Session valide pour ce jeton, ou null. */
  findSession(tokenHash: Buffer): Promise<Actor | null>;
  closeSession(actor: Actor): Promise<void>;
  getProfile(actor: Actor): Promise<AccountProfile>;
}
