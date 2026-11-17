import type { OrderState } from "@woor/core";

import type { ChipProps } from "../../components/ui/chip";
import type { SellerOrder } from "../../lib/api/account-schemas";

/** État d'une commande, dit avec les mots de la vendeuse. */
export const SELLER_STATUS: Record<OrderState, ChipProps> = {
  awaiting_payment: { tone: "wait", icon: "clock", label: "À payer" },
  locked: { tone: "locked", icon: "lock", label: "Bloqué" },
  in_transit: { tone: "route", icon: "moto", label: "En route" },
  disputed: { tone: "danger", icon: "alert", label: "Litige" },
  delivered: { tone: "done", icon: "check", label: "Remis" },
  paid_out: { tone: "done", icon: "check", label: "Payée" },
  courier_paid: { tone: "done", icon: "undo", label: "Refusée" },
  refunded: { tone: "done", icon: "undo", label: "Remboursée" },
  expired: { tone: "done", icon: "clock", label: "Expirée" },
};

export const SELLER_FILTERS = [
  { key: "en-cours", label: "En cours", states: ["locked", "in_transit", "disputed"] },
  { key: "a-payer", label: "À payer", states: ["awaiting_payment"] },
  {
    key: "terminees",
    label: "Terminées",
    states: ["delivered", "paid_out", "courier_paid", "refunded", "expired"],
  },
] as const satisfies readonly { key: string; label: string; states: readonly OrderState[] }[];

export type SellerFilterKey = (typeof SELLER_FILTERS)[number]["key"];

export function toSellerFilter(value: string | null): SellerFilterKey {
  return SELLER_FILTERS.find((filter) => filter.key === value)?.key ?? "en-cours";
}

export function filterSellerOrders(orders: SellerOrder[], key: SellerFilterKey): SellerOrder[] {
  const filter = SELLER_FILTERS.find((candidate) => candidate.key === key);
  const states: readonly OrderState[] = filter?.states ?? [];
  return orders.filter((order) => states.includes(order.state));
}

/** Argent bloqué chez les acheteurs, qui reviendra à la vendeuse à la remise. */
export function pendingForSeller(orders: SellerOrder[]): { totalXof: number; count: number } {
  const pending = orders.filter((order) =>
    (["locked", "in_transit", "disputed"] as OrderState[]).includes(order.state),
  );
  return {
    totalXof: pending.reduce((sum, order) => sum + order.itemPriceXof, 0),
    count: pending.length,
  };
}

export interface TimelineEntry {
  at: string;
  label: string;
}

/** Chronologie de la commande, reconstruite à partir de ses dates. */
export function sellerTimeline(order: SellerOrder): TimelineEntry[] {
  const entries: [string | null, string][] = [
    [order.createdAt, "Lien créé"],
    [order.claimedAt, "Un téléphone a commandé"],
    [order.lockedAt, "Les deux paiements sont bloqués"],
    [order.pickedUpAt, `Ramassé par ${order.courierName}`],
    [order.arrivedAt, `${order.courierName} est arrivé chez l'acheteur`],
    [order.deliveredAt, "Remis : le paiement est débloqué"],
    [order.closedAt, `Commande close : ${SELLER_STATUS[order.state].label.toLowerCase()}`],
  ];
  return entries.flatMap(([at, label]) => (at ? [{ at, label }] : []));
}
