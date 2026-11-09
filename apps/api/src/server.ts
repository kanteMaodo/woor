import { buildApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv();
const app = buildApp(env);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, "Arrêt de l'API");
  await app.close();
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
