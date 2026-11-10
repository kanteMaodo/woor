/** Tâches périodiques confiées à la base : échéances, versements différés, adresses. */
export interface MaintenanceTasks {
  fireDueTimers(): Promise<number>;
  releaseDuePayouts(): Promise<number>;
  applyDueAddressChanges(): Promise<number>;
}
