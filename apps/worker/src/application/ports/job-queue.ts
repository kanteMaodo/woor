/** Une tâche de la boîte d'envoi woor.outbox. */
export interface Job {
  id: string;
  topic: string;
  orderId: string | null;
  payload: unknown;
  /** Nombre de tentatives, celle-ci comprise. */
  attempts: number;
}

export interface JobQueue {
  /** Réserve des tâches prêtes ; une autre instance ne peut pas les prendre en même temps. */
  claim(topics: readonly string[], limit: number): Promise<Job[]>;
  complete(jobId: string): Promise<void>;
  retryLater(jobId: string, error: string, delaySec: number): Promise<void>;
}
