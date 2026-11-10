import type { Logger } from "../application/ports/logger";
import { sleep } from "./sleep";

/**
 * Exécute task toutes les intervalMs millisecondes, jusqu'à l'arrêt.
 * Deux exécutions ne se chevauchent jamais, et une erreur n'arrête pas la boucle.
 */
export async function runPeriodically(
  name: string,
  intervalMs: number,
  task: () => Promise<void>,
  logger: Logger,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    try {
      await task();
    } catch (error) {
      logger.error({ task: name, err: error }, "Tâche périodique en échec");
    }
    await sleep(intervalMs, signal);
  }
}
