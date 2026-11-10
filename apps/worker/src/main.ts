import { loadEnv } from "./config/env";
import { createContainer } from "./container";
import { createLogger } from "./logger";
import { runPeriodically } from "./runtime/periodic-task";

const env = loadEnv();
const logger = createLogger(env);
const container = createContainer(env, logger);

const shutdown = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    logger.info({ signal }, "Arrêt demandé");
    shutdown.abort();
  });
}

const node = await container.lightning.getInfo();
if (!node.synced) {
  logger.warn({ blockHeight: node.blockHeight }, "Nœud Lightning pas encore synchronisé");
}
logger.info({ blockHeight: node.blockHeight }, "Service de paiements démarré");

container.watcher.resume(await container.invoices.listWatchedPaymentHashes());

await Promise.all([
  container.outboxRunner.run(shutdown.signal),
  runPeriodically(
    "maintenance",
    env.MAINTENANCE_INTERVAL_MS,
    () => container.maintenance.execute(),
    logger,
    shutdown.signal,
  ),
]);

container.watcher.stop();
await container.pool.end();
logger.info({}, "Service de paiements arrêté");
