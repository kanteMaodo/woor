import Fastify, { type FastifyInstance } from "fastify";

import type { Env } from "./config/env";
import { loggerOptions } from "./http/logger";
import { errorHandler, notFoundHandler } from "./http/problem";
import { healthRoutes } from "./routes/health";

/** Construit l'application sans l'écouter : utile pour la démarrer ou l'injecter ailleurs. */
export function buildApp(env: Env): FastifyInstance {
  const app = Fastify({
    logger: loggerOptions(env),
    // En production, l'API est derrière Caddy : on fait confiance à son en-tête X-Forwarded-For.
    trustProxy: env.NODE_ENV === "production",
    bodyLimit: 64 * 1024,
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  app.register(healthRoutes, { prefix: "/v1" });

  return app;
}
