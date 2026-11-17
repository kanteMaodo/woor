import type { OrderState } from "@woor/core";

import { openAddress } from "../../delivery-address";
import type { DeliveryRecord } from "../../ports/courier-deliveries";
import type { PiiCipher } from "../../ports/pii-cipher";
import { iso } from "../seller/seller-order-view";

/** Nombre d'essais de code avant verrouillage (réglage code_max_attempts). */
export const CODE_MAX_ATTEMPTS = 5;

/** Course renvoyée au livreur : adresse déchiffrée, dates en ISO 8601. */
export interface DeliveryView {
  id: string;
  itemLabel: string;
  deliveryFeeXof: number;
  state: OrderState;
  sellerName: string;
  neighborhood: string | null;
  landmark: string | null;
  lockedAt: string | null;
  pickupDeadline: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  codeAttemptsLeft: number;
  codeLocked: boolean;
}

export function toDeliveryView(cipher: PiiCipher, record: DeliveryRecord): DeliveryView {
  const address = openAddress(cipher, record.address);
  return {
    id: record.id,
    itemLabel: record.itemLabel,
    deliveryFeeXof: record.deliveryFeeXof,
    state: record.state,
    sellerName: record.sellerName,
    neighborhood: address?.neighborhood ?? null,
    landmark: address?.landmark ?? null,
    lockedAt: iso(record.lockedAt),
    pickupDeadline: iso(record.pickupDeadline),
    pickedUpAt: iso(record.pickedUpAt),
    deliveredAt: iso(record.deliveredAt),
    closedAt: iso(record.closedAt),
    codeAttemptsLeft: Math.max(0, CODE_MAX_ATTEMPTS - record.codeAttempts),
    codeLocked: record.codeLocked,
  };
}
