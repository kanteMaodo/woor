import type { Pool } from "@woor/db";

import type { MaintenanceTasks } from "../../application/ports/maintenance";

/** Chaque tâche est une fonction SQL du schéma, exécutée dans sa propre transaction. */
export class PgMaintenanceTasks implements MaintenanceTasks {
  constructor(private readonly pool: Pool) {}

  fireDueTimers(): Promise<number> {
    return this.count("woor.fire_due_timers");
  }

  releaseDuePayouts(): Promise<number> {
    return this.count("woor.release_due_payouts");
  }

  applyDueAddressChanges(): Promise<number> {
    return this.count("woor.apply_due_address_changes");
  }

  private async count(
    fn: "woor.fire_due_timers" | "woor.release_due_payouts" | "woor.apply_due_address_changes",
  ): Promise<number> {
    const { rows } = await this.pool.query<{ n: number }>(`SELECT ${fn}() AS n`);
    return rows[0]?.n ?? 0;
  }
}
