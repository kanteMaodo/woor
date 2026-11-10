import type { JobQueue } from "../application/ports/job-queue";
import type { Logger } from "../application/ports/logger";
import type { JobHandler } from "./job-handlers";
import { sleep } from "./sleep";

/** Délais avant nouvelle tentative, selon le nombre d'échecs : de 5 s à 15 min, puis 15 min. */
const RETRY_DELAYS_SEC = [5, 15, 60, 300] as const;
const MAX_RETRY_DELAY_SEC = 900;
const BATCH_SIZE = 10;

export interface OutboxRunnerOptions {
  pollIntervalMs: number;
}

/**
 * Lit la file woor.outbox et confie chaque tâche à son gestionnaire.
 * Une tâche réussie est close ; une tâche en échec revient plus tard, avec un délai croissant.
 */
export class OutboxRunner {
  private readonly topics: string[];

  constructor(
    private readonly queue: JobQueue,
    private readonly handlers: ReadonlyMap<string, JobHandler>,
    private readonly logger: Logger,
    private readonly options: OutboxRunnerOptions,
  ) {
    this.topics = [...handlers.keys()];
  }

  async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      let processed = 0;
      try {
        processed = await this.processBatch();
      } catch (error) {
        this.logger.error({ err: error }, "Lecture de la file impossible");
      }
      // File vide ou base injoignable : on attend avant de relire.
      if (processed === 0) {
        await sleep(this.options.pollIntervalMs, signal);
      }
    }
  }

  private async processBatch(): Promise<number> {
    const jobs = await this.queue.claim(this.topics, BATCH_SIZE);

    for (const job of jobs) {
      const handler = this.handlers.get(job.topic);
      const context = {
        jobId: job.id,
        topic: job.topic,
        orderId: job.orderId,
        attempt: job.attempts,
      };
      try {
        if (!handler) {
          throw new Error(`Aucun gestionnaire pour ${job.topic}`);
        }
        await handler(job);
        await this.queue.complete(job.id);
        this.logger.debug(context, "Tâche terminée");
      } catch (error) {
        const delaySec = retryDelay(job.attempts);
        await this.queue.retryLater(job.id, describe(error), delaySec);
        this.logger.error(
          { ...context, delaySec, err: error },
          "Tâche en échec, nouvel essai prévu",
        );
      }
    }

    return jobs.length;
  }
}

function retryDelay(attempts: number): number {
  return RETRY_DELAYS_SEC[attempts - 1] ?? MAX_RETRY_DELAY_SEC;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
