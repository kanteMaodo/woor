import type { Actor } from "../../actor";
import type { AccountProfile, Accounts } from "../../ports/accounts";

/** GET /v1/me : nom et rôle, pour que le web envoie chacun sur son espace. */
export class GetProfile {
  constructor(private readonly accounts: Accounts) {}

  execute(actor: Actor): Promise<AccountProfile> {
    return this.accounts.getProfile(actor);
  }
}
