import { z } from "zod";

const API_URL = z.url().parse(process.env.API_URL ?? "http://127.0.0.1:3000");

/**
 * Seuls cookies transmis à l'API : le téléphone de l'acheteur et la session des comptes.
 * Tout autre cookie du navigateur reste sur le serveur web.
 */
const FORWARDED_COOKIES = ["woor_device", "woor_session"] as const;

const ProblemSchema = z.object({
  title: z.string(),
  status: z.number(),
  code: z.string().optional(),
});

/** Erreur renvoyée par l'API, au format problem+json. */
export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly status: number,
    message: string,
    readonly code: string | null,
  ) {
    super(message);
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Refus métier ou saisie refusée : le message peut être montré tel quel. */
  get isUserFacing(): boolean {
    return [400, 401, 409, 503].includes(this.status);
  }
}

export interface ApiResponse<T> {
  body: T;
  /** Cookies posés par l'API, à relayer tels quels vers le navigateur. */
  setCookies: string[];
}

interface ApiRequest<T> {
  method?: "GET" | "POST";
  path: string;
  /** En-tête Cookie de la requête du navigateur. */
  cookieHeader: string | null;
  schema: z.ZodType<T>;
  /** Corps JSON, pour les POST qui portent des données. */
  body?: unknown;
}

/**
 * Appelle l'API depuis le serveur web. Le navigateur ne parle jamais directement à l'API :
 * les formulaires restent utilisables sans JavaScript, et la réponse est validée ici.
 */
export async function callApi<T>({
  method = "GET",
  path,
  cookieHeader,
  schema,
  body,
}: ApiRequest<T>): Promise<ApiResponse<T>> {
  const cookie = forwardedCookies(cookieHeader);
  const response = await fetchApi(new URL(path, API_URL), {
    method,
    headers: {
      accept: "application/json",
      ...(cookie && { cookie }),
      ...(body !== undefined && { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const raw: unknown = response.status === 204 ? null : await response.json();
  return { body: schema.parse(raw), setCookies: response.headers.getSetCookie() };
}

/** API injoignable ou trop lente : une erreur 503 lisible plutôt qu'une page cassée. */
async function fetchApi(url: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(503, "Service momentanément indisponible. Réessayez dans un instant.", null);
  }
}

/** Transforme les cookies posés par l'API en en-tête Cookie, pour un appel suivant. */
export function cookieHeaderFrom(setCookies: readonly string[]): string {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = ProblemSchema.safeParse(await response.json().catch(() => null));
  return parsed.success
    ? new ApiError(response.status, parsed.data.title, parsed.data.code ?? null)
    : new ApiError(response.status, "Service indisponible", null);
}

function forwardedCookies(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const kept = header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => FORWARDED_COOKIES.some((name) => part.startsWith(`${name}=`)));
  return kept.length > 0 ? kept.join("; ") : null;
}

/**
 * Message à montrer quand l'API refuse une saisie ou une règle métier.
 * Toute autre erreur remonte telle quelle vers la page d'erreur.
 */
export function userMessageOrThrow(error: unknown): string {
  if (error instanceof ApiError && error.isUserFacing) {
    return error.message;
  }
  throw error;
}
