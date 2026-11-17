import type { AccountRole } from "@woor/core";
import { type Pool, withContext } from "@woor/db";

import type { Actor } from "../../application/actor";
import type {
  AccountProfile,
  Accounts,
  LoginCandidate,
  LoginOutcome,
} from "../../application/ports/accounts";
import { withPgErrors } from "./pg-errors";

interface LoginRow {
  user_id: string;
  pin_credential_id: string | null;
  pin_hash: string | null;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  role: AccountRole;
}

/**
 * Comptes et sessions, uniquement par les fonctions SECURITY DEFINER du schéma :
 * l'API ne lit ni n'écrit en direct les hachages de PIN ni les jetons de session.
 */
export class PgAccounts implements Accounts {
  constructor(private readonly pool: Pool) {}

  async findLoginCandidate(phoneHmac: Buffer): Promise<LoginCandidate | null> {
    const { rows } = await this.pool.query<LoginRow>(
      `SELECT user_id, pin_credential_id, pin_hash FROM woor.login_lookup($1)`,
      [phoneHmac],
    );
    const row = rows[0];
    return row
      ? { userId: row.user_id, pinCredentialId: row.pin_credential_id, pinHash: row.pin_hash }
      : null;
  }

  async recordLogin(credentialId: string, success: boolean): Promise<LoginOutcome> {
    const { rows } = await this.pool.query<{ outcome: string }>(
      `SELECT woor.record_login($1, $2) AS outcome`,
      [credentialId, success],
    );
    return rows[0]?.outcome ?? "unknown";
  }

  openSession(userId: string, tokenHash: Buffer): Promise<{ expiresAt: Date }> {
    return withPgErrors(async () => {
      const { rows } = await this.pool.query<{ expires_at: Date }>(
        `SELECT expires_at FROM woor.create_session($1, $2)`,
        [userId, tokenHash],
      );
      const row = rows[0];
      if (!row) {
        throw new Error("Session non créée");
      }
      return { expiresAt: row.expires_at };
    });
  }

  async findSession(tokenHash: Buffer): Promise<Actor | null> {
    const { rows } = await this.pool.query<SessionRow>(
      `SELECT session_id, user_id, role FROM woor.session_lookup($1)`,
      [tokenHash],
    );
    const row = rows[0];
    return row ? { sessionId: row.session_id, userId: row.user_id, role: row.role } : null;
  }

  async closeSession(actor: Actor): Promise<void> {
    await withContext(this.pool, contextOf(actor), (client) =>
      client.query(`SELECT woor.revoke_session($1)`, [actor.sessionId]),
    );
  }

  getProfile(actor: Actor): Promise<AccountProfile> {
    return withContext(this.pool, contextOf(actor), async (client) => {
      const { rows } = await client.query<{ display_name: string; role: AccountRole }>(
        `SELECT display_name, role FROM woor.users WHERE id = $1`,
        [actor.userId],
      );
      const row = rows[0];
      if (!row) {
        throw new Error("Compte de la session introuvable");
      }
      return { displayName: row.display_name, role: row.role };
    });
  }
}

/** Contexte SQL d'une personne connectée : rôle, identifiant et session. */
export function contextOf(actor: Actor) {
  return { role: actor.role, userId: actor.userId, sessionId: actor.sessionId };
}
