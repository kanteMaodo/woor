import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";

import type { Env } from "./config/env";
import type { Container } from "./container";
import { loggerOptions } from "./http/logger";
import { errorHandler, notFoundHandler } from "./http/problem";
import { authRoutes } from "./http/routes/auth-routes";
import { buyerRoutes } from "./http/routes/buyer-routes";
import { courierRoutes } from "./http/routes/courier-routes";
import { healthRoutes } from "./http/routes/health";
import { sellerRoutes } from "./http/routes/seller-routes";

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
  const secureCookies = env.NODE_ENV === "production";
  app.register(buyerRoutes, { prefix: "/v1", buyer: container.buyer, secureCookies });
  app.register(authRoutes, { prefix: "/v1", auth: container.auth, secureCookies });
  app.register(sellerRoutes, { prefix: "/v1", auth: container.auth, seller: container.seller });
  app.register(courierRoutes, { prefix: "/v1", auth: container.auth, courier: container.courier });

  return app;
}
