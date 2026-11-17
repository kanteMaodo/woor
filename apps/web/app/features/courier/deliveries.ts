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

export function isActiveDelivery(delivery: Delivery): boolean {
  return ACTIVE_STATES.includes(delivery.state);
}

/** Courses du jour encore à faire, et ce qu'elles rapporteront. */
export function activeDeliveries(deliveries: Delivery[]): { totalXof: number; count: number } {
  const active = deliveries.filter(isActiveDelivery);
  return {
    totalXof: active.reduce((sum, delivery) => sum + delivery.deliveryFeeXof, 0),
    count: active.length,
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
