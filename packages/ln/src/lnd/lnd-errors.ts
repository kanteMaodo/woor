import { LightningError } from "../lightning-error";

/**
 * La bibliothèque lightning rejette ses promesses avec un tableau [code, message, détails].
 * On le convertit en LightningError pour que le reste du code ne manipule que des Error.
 */
export function toLightningError(raw: unknown): LightningError {
  if (raw instanceof LightningError) {
    return raw;
  }
  if (Array.isArray(raw)) {
    const [code, message] = raw as [unknown, unknown];
    return new LightningError(
      typeof message === "string" ? message : "Erreur LND",
      typeof code === "number" ? code : null,
      { cause: raw },
    );
  }
  if (raw instanceof Error) {
    return new LightningError(raw.message, null, { cause: raw });
  }
  return new LightningError("Erreur LND inconnue", null, { cause: raw });
}

/** Exécute un appel LND et normalise son erreur éventuelle. */
export async function callLnd<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (raw) {
    throw toLightningError(raw);
  }
}
