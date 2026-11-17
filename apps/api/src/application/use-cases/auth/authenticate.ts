import type { AccountRole } from "@woor/core";

import type { Actor } from "../../actor";
import { AuthenticationError, NotFoundError } from "../../errors";
import type { Accounts } from "../../ports/accounts";
import type { AuthSecrets } from "../../ports/auth-secrets";

const NO_SESSION = new AuthenticationError("no_session", "Connectez-vous pour continuer.");

/** Retrouve la personne connectée à partir du jeton de son cookie de session. */
export class Authenticate {
  constructor(
    private readonly accounts: Accounts,
    private readonly secrets: AuthSecrets,
  ) {}

  async execute(sessionToken: string | null): Promise<Actor> {
    if (!sessionToken) {
      throw NO_SESSION;
    }
    const actor = await this.accounts.findSession(this.secrets.hashSessionToken(sessionToken));
    if (!actor) {
      throw NO_SESSION;
    }
    return actor;
  }
}

/** Une vendeuse n'a rien à faire sur les routes du livreur : on répond « introuvable ». */
export function requireRole(actor: Actor, role: AccountRole): Actor {
  if (actor.role !== role) {
    throw new NotFoundError();
  }
  return actor;
}
