import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";

import type { Env } from "./config/env";
import type { Container } from "./container";
import { loggerOptions } from "./http/logger";
import { errorHandler, notFoundHandler } from "./http/problem";
import { buyerRoutes } from "./http/routes/buyer-routes";
import { healthRoutes } from "./http/routes/health";

/** Construit l'application sans l'écouter : le serveur ou un autre point d'entrée la démarre. */
export function buildApp(env: Env, container: Container): FastifyInstance {
  const app = Fastify({
    logger: loggerOptions(env),
    // En production, l'API est derrière Caddy : on fait confiance à son en-tête X-Forwarded-For.
    trustProxy: env.NODE_ENV === "production",
    bodyLimit: 64 * 1024,
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  app.register(cookie);
  app.register(healthRoutes, { prefix: "/v1" });
  app.register(buyerRoutes, {
    prefix: "/v1",
    buyer: container.buyer,
    secureCookies: env.NODE_ENV === "production",
  });

  return app;
}
