import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import type { AuthUseCases, CourierUseCases } from "../../application/account-use-cases";
import type { Actor } from "../../application/actor";
import { requireRole } from "../../application/use-cases/auth/authenticate";
import { readSessionToken } from "../session-cookie";

export interface CourierRoutesOptions {
  auth: AuthUseCases;
  courier: CourierUseCases;
}

const OrderParams = z.object({ id: z.uuid() });
export const CodeBody = z.strictObject({
  code: z.string().regex(/^\d{6}$/, "Le code de remise doit contenir exactement 6 chiffres."),
});

/** Espace du livreur : chaque route exige une session de livreur. */
export const courierRoutes: FastifyPluginAsync<CourierRoutesOptions> = async (
  app,
  { auth, courier },
) => {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });

  const asCourier = async (request: FastifyRequest): Promise<Actor> =>
    requireRole(await auth.authenticate.execute(readSessionToken(request)), "courier");

  app.get("/courier/orders", async (request) =>
    courier.listDeliveries.execute(await asCourier(request)),
  );

  app.get("/courier/orders/:id", async (request) => {
    const actor = await asCourier(request);
    return courier.getDelivery.execute(actor, OrderParams.parse(request.params).id);
  });

  app.post("/courier/orders/:id/pickup", async (request) => {
    const actor = await asCourier(request);
    const state = await courier.confirmPickup.execute(actor, OrderParams.parse(request.params).id);
    return { state };
  });

  app.post("/courier/orders/:id/code", async (request) => {
    const actor = await asCourier(request);
    const { code } = CodeBody.parse(request.body);
    return courier.submitDeliveryCode.execute(actor, OrderParams.parse(request.params).id, code);
  });
};
