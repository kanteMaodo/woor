import { isValidPin, toSenegalE164 } from "@woor/core";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthUseCases } from "../../application/account-use-cases";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "../session-cookie";

export interface AuthRoutesOptions {
  auth: AuthUseCases;
  secureCookies: boolean;
}

export const LogInBody = z.strictObject({
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => toSenegalE164(value) !== null, "Numéro de mobile sénégalais invalide."),
  pin: z.string().refine(isValidPin, "Le PIN doit contenir exactement 6 chiffres."),
});

/** Connexion par numéro et PIN, profil, déconnexion. */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { auth, secureCookies },
) => {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });

  app.post("/auth/login", async (request, reply) => {
    const { sessionToken, expiresAt } = await auth.logIn.execute(LogInBody.parse(request.body));
    setSessionCookie(reply, sessionToken, expiresAt, secureCookies);
    const actor = await auth.authenticate.execute(sessionToken);
    return auth.getProfile.execute(actor);
  });

  app.post("/auth/logout", async (request, reply) => {
    const actor = await auth.authenticate.execute(readSessionToken(request)).catch(() => null);
    if (actor) {
      await auth.logOut.execute(actor);
    }
    clearSessionCookie(reply, secureCookies);
    return reply.status(204).send();
  });

  app.get("/me", async (request) => {
    const actor = await auth.authenticate.execute(readSessionToken(request));
    return auth.getProfile.execute(actor);
  });
};
