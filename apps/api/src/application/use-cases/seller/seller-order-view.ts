import type { OrderState } from "@woor/core";

import { openAddress } from "../../delivery-address";
import type { PiiCipher } from "../../ports/pii-cipher";
import type { SellerOrderRecord } from "../../ports/seller-orders";

/** Commande renvoyée à la vendeuse : adresse déchiffrée, dates en ISO 8601. */
export interface SellerOrderView {
  id: string;
  itemLabel: string;
  itemPriceXof: number;
  deliveryFeeXof: number;
  totalXof: number;
  state: OrderState;
  courierName: string;
  neighborhood: string | null;
  landmark: string | null;
  createdAt: string;
  claimedAt: string | null;
  lockedAt: string | null;
  pickedUpAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
}

export function toSellerOrderView(cipher: PiiCipher, record: SellerOrderRecord): SellerOrderView {
  const address = openAddress(cipher, record.address);
  return {
    id: record.id,
    itemLabel: record.itemLabel,
    itemPriceXof: record.itemPriceXof,
    deliveryFeeXof: record.deliveryFeeXof,
    totalXof: record.totalXof,
    state: record.state,
    courierName: record.courierName,
    neighborhood: address?.neighborhood ?? null,
    landmark: address?.landmark ?? null,
    createdAt: record.createdAt.toISOString(),
    claimedAt: iso(record.claimedAt),
    lockedAt: iso(record.lockedAt),
    pickedUpAt: iso(record.pickedUpAt),
    arrivedAt: iso(record.arrivedAt),
    deliveredAt: iso(record.deliveredAt),
    closedAt: iso(record.closedAt),
  };
}

export function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
