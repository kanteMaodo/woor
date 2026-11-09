import { pino, type Logger } from "pino";

import type { Env } from "./config/env";

export function createLogger(env: Env): Logger {
  return pino({
    name: "worker",
    level: env.LOG_LEVEL,
    // Les secrets de déblocage et les macarons ne doivent jamais atteindre un journal.
    redact: { paths: ["*.preimage", "*.macaroon", "*.secret"], censor: "[masqué]" },
    ...(env.NODE_ENV === "development" && {
      transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } },
    }),
  });
}
