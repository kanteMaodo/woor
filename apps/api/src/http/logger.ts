import type { FastifyServerOptions } from "fastify";

import type { Env } from "../config/env";

/**
 * Journaux sans données sensibles.
 * On journalise le modèle de route (/v1/o/:token), jamais l'URL réelle : le jeton
 * du lien acheteur ne doit jamais apparaître dans un journal.
 */
export function loggerOptions(env: Env): FastifyServerOptions["logger"] {
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
      censor: "[masqué]",
    },
    serializers: {
      req(request: { id: string; method: string; routeOptions?: { url?: string } }) {
        return {
          id: request.id,
          method: request.method,
          route: request.routeOptions?.url ?? "inconnue",
        };
      },
    },
    ...(env.NODE_ENV === "development" && {
      transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } },
    }),
  };
}
