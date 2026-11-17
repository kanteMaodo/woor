import type { OrderState } from "@woor/core";

import type { Actor } from "../actor";
import type { SealedText } from "./pii-cipher";

export interface LinkedCourier {
  id: string;
  displayName: string;
  phoneLast2: string;
}

export interface NewOrderRecord {
  tokenHash: Buffer;
  courierId: string;
  itemLabel: string;
  itemPriceXof: number;
  deliveryFeeXof: number;
  address: SealedText;
}

/** Une commande telle que la vendeuse la voit, adresse encore chiffrée. */
export interface SellerOrderRecord {
  id: string;
  itemLabel: string;
  itemPriceXof: number;
  deliveryFeeXof: number;
  totalXof: number;
  state: OrderState;
  courierName: string;
  address: SealedText | null;
  createdAt: Date;
  claimedAt: Date | null;
  lockedAt: Date | null;
  pickedUpAt: Date | null;
  arrivedAt: Date | null;
  deliveredAt: Date | null;
  closedAt: Date | null;
}

/** Commandes de la vendeuse connectée. La RLS ne lui montre que les siennes. */
export interface SellerOrders {
  listCouriers(actor: Actor): Promise<LinkedCourier[]>;
  create(actor: Actor, order: NewOrderRecord): Promise<string>;
  list(actor: Actor): Promise<SellerOrderRecord[]>;
  find(actor: Actor, orderId: string): Promise<SellerOrderRecord | null>;
  cancel(actor: Actor, orderId: string): Promise<OrderState>;
}
