import type { OrderState } from "@woor/core";

import type { ChipProps } from "../../components/ui/chip";
import type { SellerOrder } from "../../lib/api/account-schemas";

/** État d’une commande, dit avec les mots de la vendeuse. */
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

/** Nombre de commandes derrière chaque filtre, affiché sur l’onglet. */
export function countByFilter(orders: SellerOrder[]): Record<SellerFilterKey, number> {
  return Object.fromEntries(
    SELLER_FILTERS.map((filter) => [filter.key, filterSellerOrders(orders, filter.key).length]),
  ) as Record<SellerFilterKey, number>;
}

export interface SellerKpis {
  /** Prix des articles bloqués chez les acheteurs, versés à la remise. */
  pendingXof: number;
  pendingCount: number;
  /** Liens envoyés, pas encore payés. */
  awaitingCount: number;
  /** Commandes remises : le prix de l’article est acquis à la vendeuse. */
  deliveredCount: number;
  earnedXof: number;
}

const PENDING: readonly OrderState[] = ["locked", "in_transit", "disputed"];
const EARNED: readonly OrderState[] = ["delivered", "paid_out"];

export function sellerKpis(orders: SellerOrder[]): SellerKpis {
  const pending = orders.filter((order) => PENDING.includes(order.state));
  const earned = orders.filter((order) => EARNED.includes(order.state));
  return {
    pendingXof: sum(pending.map((order) => order.itemPriceXof)),
    pendingCount: pending.length,
    awaitingCount: orders.filter((order) => order.state === "awaiting_payment").length,
    deliveredCount: earned.length,
    earnedXof: sum(earned.map((order) => order.itemPriceXof)),
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
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
    [order.arrivedAt, `${order.courierName} est arrivé chez l’acheteur`],
    [order.deliveredAt, "Remis : le paiement est débloqué"],
    [order.closedAt, `Commande close : ${SELLER_STATUS[order.state].label.toLowerCase()}`],
  ];
  return entries.flatMap(([at, label]) => (at ? [{ at, label }] : []));
}
