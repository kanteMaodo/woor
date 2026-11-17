import type { FastifyReply, FastifyRequest } from "fastify";

export const SESSION_COOKIE = "woor_session";

/** 256 bits en base64url, sans remplissage. */
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function readSessionToken(request: FastifyRequest): string | null {
  const token = request.cookies[SESSION_COOKIE];
  return token && SESSION_TOKEN_PATTERN.test(token) ? token : null;
}

/** Cookie HttpOnly : le JavaScript de la page ne peut pas voler la session. */
export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply, secure: boolean): void {
  reply.clearCookie(SESSION_COOKIE, { httpOnly: true, secure, sameSite: "lax", path: "/" });
}
