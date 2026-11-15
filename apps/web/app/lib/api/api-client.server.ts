import { z } from "zod";

const API_URL = z.url().parse(process.env.API_URL ?? "http://127.0.0.1:3000");

/** Seul cookie transmis à l'API : celui qui identifie le téléphone de l'acheteur. */
const DEVICE_COOKIE = "woor_device";

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
}: ApiRequest<T>): Promise<ApiResponse<T>> {
  const deviceCookie = pickCookie(cookieHeader, DEVICE_COOKIE);
  const response = await fetch(new URL(path, API_URL), {
    method,
    headers: {
      accept: "application/json",
      ...(deviceCookie && { cookie: `${DEVICE_COOKIE}=${deviceCookie}` }),
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const raw: unknown = response.status === 204 ? null : await response.json();
  return { body: schema.parse(raw), setCookies: response.headers.getSetCookie() };
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

function pickCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      return value.join("=");
    }
  }
  return null;
}
