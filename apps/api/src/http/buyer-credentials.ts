import type { FastifyReply, FastifyRequest } from "fastify";

import { NotFoundError } from "../application/errors";
import type { BuyerCredentials } from "../application/use-cases/buyer-access";

export const DEVICE_COOKIE = "woor_device";

const DEVICE_COOKIE_MAX_AGE_SEC = 30 * 24 * 3600;
/** 128 bits en base64url, sans remplissage. */
const ORDER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
/** 256 bits en base64url, sans remplissage. */
const DEVICE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Jeton du lien et cookie du téléphone. Un jeton mal formé donne la même réponse qu'un inconnu. */
export function readBuyerCredentials(request: FastifyRequest): BuyerCredentials {
  const { token } = request.params as { token?: string };
  if (!token || !ORDER_TOKEN_PATTERN.test(token)) {
    throw new NotFoundError();
  }
  const device = request.cookies[DEVICE_COOKIE];
  return {
    orderToken: token,
    deviceToken: device && DEVICE_TOKEN_PATTERN.test(device) ? device : null,
  };
}

/**
 * Cookie HttpOnly : le JavaScript de la page ne peut pas le lire.
 * SameSite=Lax et non Strict : l'acheteur arrive depuis WhatsApp, un autre site,
 * et le cookie doit accompagner cette première visite pour reconnaître le téléphone.
 */
export function setDeviceCookie(reply: FastifyReply, deviceToken: string, secure: boolean): void {
  reply.setCookie(DEVICE_COOKIE, deviceToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE_SEC,
  });
}
