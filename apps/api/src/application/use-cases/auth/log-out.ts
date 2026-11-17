import type { Actor } from "../../actor";
import type { Accounts } from "../../ports/accounts";

/** Révoque la session en base : le cookie volé ne sert plus à rien. */
export class LogOut {
  constructor(private readonly accounts: Accounts) {}

  execute(actor: Actor): Promise<void> {
    return this.accounts.closeSession(actor);
  }
}
