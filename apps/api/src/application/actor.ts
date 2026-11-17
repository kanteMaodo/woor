import type { AccountRole } from "@woor/core";

/** Personne connectée, retrouvée à partir de son cookie de session. */
export interface Actor {
  userId: string;
  role: AccountRole;
  sessionId: string;
}
