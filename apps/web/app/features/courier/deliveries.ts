import type { OrderState } from "@woor/core";

import type { ChipProps } from "../../components/ui/chip";
import type { Delivery } from "../../lib/api/account-schemas";

/** État d'une course, dit avec les mots du livreur. */
export const COURIER_STATUS: Record<OrderState, ChipProps> = {
  awaiting_payment: { tone: "wait", icon: "clock", label: "Pas encore payée" },
  locked: { tone: "locked", icon: "lock", label: "À ramasser" },
  in_transit: { tone: "route", icon: "moto", label: "En route" },
  disputed: { tone: "danger", icon: "alert", label: "Litige" },
  delivered: { tone: "done", icon: "check", label: "Payée" },
  paid_out: { tone: "done", icon: "check", label: "Payée" },
  courier_paid: { tone: "done", icon: "check", label: "Course payée" },
  refunded: { tone: "done", icon: "undo", label: "Annulée" },
  expired: { tone: "done", icon: "clock", label: "Expirée" },
};

const ACTIVE_STATES: readonly OrderState[] = ["locked", "in_transit", "disputed"];
const EARNED_STATES: readonly OrderState[] = ["delivered", "paid_out", "courier_paid"];

export function isActiveDelivery(delivery: Delivery): boolean {
  return ACTIVE_STATES.includes(delivery.state);
}

export interface CourierKpis {
  toPickUp: number;
  onTheWay: number;
  /** Courses en cours : payées à la remise. */
  pendingXof: number;
  /** Courses remises ou refusées à la porte : acquises au livreur. */
  earnedXof: number;
  earnedCount: number;
}

export function courierKpis(deliveries: Delivery[]): CourierKpis {
  const active = deliveries.filter(isActiveDelivery);
  const earned = deliveries.filter((delivery) => EARNED_STATES.includes(delivery.state));
  return {
    toPickUp: deliveries.filter((delivery) => delivery.state === "locked").length,
    onTheWay: deliveries.filter((delivery) => delivery.state === "in_transit").length,
    pendingXof: active.reduce((total, delivery) => total + delivery.deliveryFeeXof, 0),
    earnedXof: earned.reduce((total, delivery) => total + delivery.deliveryFeeXof, 0),
    earnedCount: earned.length,
  };
}

/** Ce que l'écran d'une course doit montrer, selon son état. */
export type DeliveryStep = "pickup" | "handover" | "paid" | "closed";

export function deliveryStep(delivery: Delivery): DeliveryStep {
  switch (delivery.state) {
    case "locked":
      return "pickup";
    case "in_transit":
      return "handover";
    case "delivered":
    case "paid_out":
      return "paid";
    default:
      return "closed";
  }
}
