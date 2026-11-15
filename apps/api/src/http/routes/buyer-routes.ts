import type { FastifyPluginAsync } from "fastify";

import type { BuyerUseCases } from "../../application/buyer-use-cases";
import { readBuyerCredentials, setDeviceCookie } from "../buyer-credentials";

export interface BuyerRoutesOptions {
  buyer: BuyerUseCases;
  secureCookies: boolean;
}

/**
 * Routes de l'acheteur, sans compte : le lien identifie la commande, le cookie le téléphone.
 * Aucune route GET ne modifie quoi que ce soit, car les aperçus de lien les appellent.
 */
export const buyerRoutes: FastifyPluginAsync<BuyerRoutesOptions> = async (
  app,
  { buyer, secureCookies },
) => {
  // Réponses propres à un acheteur : jamais mises en cache.
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });

  app.get("/o/:token", async (request) =>
    buyer.getPublicOrder.execute(readBuyerCredentials(request).orderToken),
  );

  app.get("/o/:token/me", async (request) =>
    buyer.getBuyerOrder.execute(readBuyerCredentials(request)),
  );

  app.post("/o/:token/claim", async (request, reply) => {
    const { deviceToken } = await buyer.claimOrder.execute(readBuyerCredentials(request));
    setDeviceCookie(reply, deviceToken, secureCookies);
    return reply.status(204).send();
  });

  app.post("/o/:token/invoices", async (request, reply) => {
    const status = await buyer.requestInvoices.execute(readBuyerCredentials(request));
    return reply.status(202).send({ status });
  });

  app.post("/o/:token/code", async (request) =>
    buyer.revealDeliveryCode.execute(readBuyerCredentials(request)),
  );

  app.post("/o/:token/cancel", async (request) => {
    const state = await buyer.cancelBuyerOrder.execute(readBuyerCredentials(request));
    return { state };
  });
};
