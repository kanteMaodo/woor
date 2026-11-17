import { z } from "zod";

const base64Key = z
  .string()
  .refine(
    (value) => Buffer.from(value, "base64").length === 32,
    "clé de 32 octets en base64 attendue",
  );

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

  // En recette et en pilote : compte de connexion membre du rôle woor_api.
  API_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  // Clé HMAC des codes de remise : sans elle, la base ne permet pas de retrouver un code.
  CODE_HMAC_KEY: base64Key,

  // Connexion : HMAC des numéros (retrouver un compte sans stocker le numéro en clair)
  // et « poivre » des PIN (une fuite de la base ne suffit pas pour les casser hors ligne).
  PHONE_HMAC_KEY: base64Key,
  PIN_PEPPER: base64Key,

  // Chiffrement des adresses de livraison. L'identifiant est rangé avec chaque texte chiffré.
  PII_KEY: base64Key,
  PII_KEY_ID: z.coerce.number().int().min(1).max(32_767).default(1),
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
