import { BusinessRuleError, NotFoundError } from "../../application/errors";

/** Codes SQLSTATE levés par les fonctions du schéma. */
const RAISED_BY_RULE = "P0001";
const NOT_FOUND = "P0002";
const NOT_ALLOWED = "42501";

const GENERIC_MESSAGE = "Action impossible pour le moment.";

interface PgError {
  code: string;
  message: string;
}

/**
 * Traduit une erreur levée par une fonction SQL en erreur de l'application.
 * Les fonctions écrivent « code_stable: message en français » : on garde les deux.
 * Un refus de droit devient « introuvable », pour ne rien révéler.
 */
export function translatePgError(error: unknown): unknown {
  if (!isPgError(error)) {
    return error;
  }
  switch (error.code) {
    case NOT_ALLOWED:
    case NOT_FOUND:
      return new NotFoundError();
    case RAISED_BY_RULE: {
      const separator = error.message.indexOf(":");
      const code = separator === -1 ? error.message : error.message.slice(0, separator);
      const message =
        separator === -1 ? GENERIC_MESSAGE : error.message.slice(separator + 1).trim();
      return new BusinessRuleError(code.trim(), message || GENERIC_MESSAGE);
    }
    default:
      return error;
  }
}

/** Exécute une requête et traduit son erreur éventuelle. */
export async function withPgErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw translatePgError(error);
  }
}

function isPgError(error: unknown): error is PgError {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}
