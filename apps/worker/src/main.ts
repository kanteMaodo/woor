import { loadEnv } from "./config/env";
import { JOB_NAMES } from "./jobs/job-names";
import { createLogger } from "./logger";

const env = loadEnv();
const logger = createLogger(env);

function waitForShutdownSignal(): Promise<NodeJS.Signals> {
  return new Promise((resolve) => {
    process.once("SIGINT", () => resolve("SIGINT"));
    process.once("SIGTERM", () => resolve("SIGTERM"));
  });
}

// Garde le processus en vie tant que la file de tâches (phase 1) n'existe pas encore.
const keepAlive = setInterval(() => undefined, 60_000);

logger.info({ jobs: JOB_NAMES }, "Service de paiements démarré");

const signal = await waitForShutdownSignal();
clearInterval(keepAlive);
logger.info({ signal }, "Arrêt du service de paiements");
