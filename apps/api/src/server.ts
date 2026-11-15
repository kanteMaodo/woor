import { buildApp } from "./app";
import { loadEnv } from "./config/env";
import { createContainer } from "./container";

const env = loadEnv();
const container = createContainer(env);
const app = buildApp(env, container);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, "Arrêt de l'API");
  await app.close();
  await container.pool.end();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.fatal({ err: error }, "Démarrage impossible");
  process.exit(1);
}
