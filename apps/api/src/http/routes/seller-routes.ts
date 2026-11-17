import { ORDER_LIMITS } from "@woor/core";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import type { AuthUseCases, SellerUseCases } from "../../application/account-use-cases";
import type { Actor } from "../../application/actor";
import { requireRole } from "../../application/use-cases/auth/authenticate";
import { readSessionToken } from "../session-cookie";

export interface SellerRoutesOptions {
  auth: AuthUseCases;
  seller: SellerUseCases;
}

const { itemLabel, itemPriceXof, deliveryFeeXof, neighborhood, landmark } = ORDER_LIMITS;

const NewOrderBody = z.object({
  itemLabel: z.string().trim().min(itemLabel.min).max(itemLabel.max),
  itemPriceXof: z.number().int().min(itemPriceXof.min).max(itemPriceXof.max),
  deliveryFeeXof: z.number().int().min(deliveryFeeXof.min).max(deliveryFeeXof.max),
  courierId: z.uuid(),
  neighborhood: z.string().trim().min(neighborhood.min).max(neighborhood.max),
  landmark: z.string().trim().max(landmark.max).default(""),
});

const OrderParams = z.object({ id: z.uuid() });

/** Espace de la vendeuse : chaque route exige une session de vendeuse. */
export const sellerRoutes: FastifyPluginAsync<SellerRoutesOptions> = async (
  app,
  { auth, seller },
) => {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });

  const asSeller = async (request: FastifyRequest): Promise<Actor> =>
    requireRole(await auth.authenticate.execute(readSessionToken(request)), "seller");

  app.get("/seller/couriers", async (request) =>
    seller.listLinkedCouriers.execute(await asSeller(request)),
  );

  app.get("/seller/orders", async (request) => seller.listOrders.execute(await asSeller(request)));

  app.post("/seller/orders", async (request, reply) => {
    const actor = await asSeller(request);
    const body = NewOrderBody.parse(request.body);
    const created = await seller.createOrder.execute(actor, {
      itemLabel: body.itemLabel,
      itemPriceXof: body.itemPriceXof,
      deliveryFeeXof: body.deliveryFeeXof,
      courierId: body.courierId,
      address: { neighborhood: body.neighborhood, landmark: body.landmark },
    });
    return reply.status(201).send(created);
  });

  app.get("/seller/orders/:id", async (request) => {
    const actor = await asSeller(request);
    return seller.getOrder.execute(actor, OrderParams.parse(request.params).id);
  });

  app.post("/seller/orders/:id/cancel", async (request) => {
    const actor = await asSeller(request);
    const state = await seller.cancelOrder.execute(actor, OrderParams.parse(request.params).id);
    return { state };
  });
};
