import type { Logger } from "../ports/logger";
import type { MaintenanceTasks } from "../ports/maintenance";

/**
 * Tâche timer.fire, chaque minute : applique les échéances dues, libère les versements
 * différés arrivés à terme et applique les changements d'adresse après leurs 24 h.
 */
export class RunMaintenance {
  constructor(
    private readonly tasks: MaintenanceTasks,
    private readonly logger: Logger,
  ) {}

  async execute(): Promise<void> {
    const timersFired = await this.tasks.fireDueTimers();
    const payoutsReleased = await this.tasks.releaseDuePayouts();
    const addressesApplied = await this.tasks.applyDueAddressChanges();

    if (timersFired + payoutsReleased + addressesApplied > 0) {
      this.logger.info({ timersFired, payoutsReleased, addressesApplied }, "Échéances appliquées");
    }
  }
}
