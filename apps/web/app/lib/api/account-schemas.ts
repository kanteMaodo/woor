import { ORDER_STATES } from "@woor/core";
import { z } from "zod";

/** Contrat des réponses de l'API pour les comptes. Validé à chaque appel par le serveur web. */
export const ProfileSchema = z.object({
  displayName: z.string(),
  role: z.enum(["seller", "courier", "arbiter", "admin"]),
});

export const LinkedCourierSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  phoneLast2: z.string(),
});

const timestamp = z.string().nullable();

export const SellerOrderSchema = z.object({
  id: z.string(),
  itemLabel: z.string(),
  itemPriceXof: z.number(),
  deliveryFeeXof: z.number(),
  totalXof: z.number(),
  state: z.enum(ORDER_STATES),
  courierName: z.string(),
  neighborhood: z.string().nullable(),
  landmark: z.string().nullable(),
  createdAt: z.string(),
  claimedAt: timestamp,
  lockedAt: timestamp,
  pickedUpAt: timestamp,
  arrivedAt: timestamp,
  deliveredAt: timestamp,
  closedAt: timestamp,
});

export const CreatedOrderSchema = z.object({
  orderId: z.string(),
  orderToken: z.string(),
});

export const DeliverySchema = z.object({
  id: z.string(),
  itemLabel: z.string(),
  deliveryFeeXof: z.number(),
  state: z.enum(ORDER_STATES),
  sellerName: z.string(),
  neighborhood: z.string().nullable(),
  landmark: z.string().nullable(),
  lockedAt: timestamp,
  pickupDeadline: timestamp,
  pickedUpAt: timestamp,
  deliveredAt: timestamp,
  closedAt: timestamp,
  codeAttemptsLeft: z.number(),
  codeLocked: z.boolean(),
});

export const CodeSubmissionSchema = z.discriminatedUnion("result", [
  z.object({ result: z.literal("ok") }),
  z.object({ result: z.literal("wrong"), attemptsLeft: z.number() }),
]);

export type Profile = z.infer<typeof ProfileSchema>;
export type LinkedCourier = z.infer<typeof LinkedCourierSchema>;
export type SellerOrder = z.infer<typeof SellerOrderSchema>;
export type CreatedOrder = z.infer<typeof CreatedOrderSchema>;
export type Delivery = z.infer<typeof DeliverySchema>;
export type CodeSubmission = z.infer<typeof CodeSubmissionSchema>;
