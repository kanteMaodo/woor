import type { OrderState } from "@woor/core";

import type { Actor } from "../actor";
import type { SealedText } from "./pii-cipher";

/** Une course telle que le livreur la voit, adresse encore chiffrée. */
export interface DeliveryRecord {
  id: string;
  itemLabel: string;
  deliveryFeeXof: number;
  state: OrderState;
  sellerName: string;
  address: SealedText | null;
  lockedAt: Date | null;
  pickupDeadline: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  closedAt: Date | null;
  codeAttempts: number;
  codeLocked: boolean;
}

/** Résultat de woor.verify_delivery_code. */
export type CodeCheck = "ok" | "wrong" | "locked" | "not_allowed";

/** Courses du livreur connecté. La RLS ne lui montre que celles qui lui sont confiées. */
export interface CourierDeliveries {
  list(actor: Actor): Promise<DeliveryRecord[]>;
  find(actor: Actor, orderId: string): Promise<DeliveryRecord | null>;
  confirmPickup(actor: Actor, orderId: string): Promise<OrderState>;
  verifyCode(actor: Actor, orderId: string, codeHmac: Buffer): Promise<CodeCheck>;
}
