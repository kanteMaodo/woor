import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthUseCases } from "../../application/account-use-cases";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "../session-cookie";

export interface AuthRoutesOptions {
  auth: AuthUseCases;
  secureCookies: boolean;
}

const LogInBody = z.object({
  phone: z.string().max(30),
  pin: z.string().max(12),
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
