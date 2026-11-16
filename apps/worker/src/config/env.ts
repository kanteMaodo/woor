import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // En recette et en pilote : compte de connexion membre du rôle woor_worker.
  WORKER_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  LND_SOCKET: z.string().regex(/^[\w.-]+:\d+$/, "format attendu : hôte:port"),
  LND_CERT_BASE64: z.string().min(1),
  LND_MACAROON: z.string().min(1),

  PREIMAGE_KEYS: z.string().min(1),
  PREIMAGE_ACTIVE_KEY_ID: z.coerce.number().int().min(1),

  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(100).default(1_000),
  MAINTENANCE_INTERVAL_MS: z.coerce.number().int().min(1_000).default(60_000),
});

export type Env = z.infer<typeof EnvSchema>;

/** Lit et valide la configuration au démarrage : le service refuse de partir si elle est fausse. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Configuration invalide :\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
