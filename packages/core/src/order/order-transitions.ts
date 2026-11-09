import type { AppRole } from "../roles";
import type { OrderState } from "./order-state";

/**
 * Machine à états des commandes.
 *
 * Miroir exact de la table SQL woor.order_transitions. La base reste l'autorité :
 * woor.apply_order_event() refuse toute transition absente de sa table. Cette copie
 * sert à l'interface et au worker pour savoir à l'avance ce qui est permis.
 * Toute modification doit être faite aux deux endroits, dans la même migration.
 */
export const ORDER_TRANSITIONS = [
  { from: "awaiting_payment", event: "invoices_locked", to: "locked", roles: ["system"] },
  { from: "awaiting_payment", event: "payment_timeout", to: "expired", roles: ["system"] },
  { from: "awaiting_payment", event: "cancel", to: "expired", roles: ["seller", "buyer"] },
  { from: "locked", event: "pickup_confirmed", to: "in_transit", roles: ["courier"] },
  { from: "locked", event: "cancel", to: "refunded", roles: ["seller", "buyer"] },
  { from: "locked", event: "pickup_timeout", to: "refunded", roles: ["system"] },
  { from: "locked", event: "dispute_timeout", to: "refunded", roles: ["system"] },
  { from: "locked", event: "decide_cancel_both", to: "refunded", roles: ["arbiter"] },
  { from: "locked", event: "hard_stop", to: "refunded", roles: ["system"] },
  { from: "in_transit", event: "code_valid", to: "delivered", roles: ["courier"] },
  {
    from: "in_transit",
    event: "refusal_confirmed",
    to: "courier_paid",
    roles: ["buyer", "system"],
  },
  { from: "in_transit", event: "no_show_confirmed", to: "courier_paid", roles: ["system"] },
  { from: "in_transit", event: "cancel", to: "courier_paid", roles: ["buyer"] },
  {
    from: "in_transit",
    event: "dispute_opened",
    to: "disputed",
    roles: ["buyer", "seller", "courier", "arbiter", "system"],
  },
  { from: "in_transit", event: "hard_stop", to: "refunded", roles: ["system"] },
  { from: "disputed", event: "decide_settle_both", to: "delivered", roles: ["arbiter"] },
  { from: "disputed", event: "decide_fee_only", to: "courier_paid", roles: ["arbiter"] },
  { from: "disputed", event: "decide_cancel_both", to: "refunded", roles: ["arbiter"] },
  { from: "disputed", event: "decide_resume", to: "in_transit", roles: ["arbiter"] },
  { from: "disputed", event: "dispute_timeout", to: "refunded", roles: ["system"] },
  { from: "disputed", event: "hard_stop", to: "refunded", roles: ["system"] },
  { from: "delivered", event: "payouts_done", to: "paid_out", roles: ["system"] },
  { from: "delivered", event: "decide_refund_buyer", to: "refunded", roles: ["arbiter"] },
] as const satisfies readonly OrderTransition[];

export interface OrderTransition {
  readonly from: OrderState;
  readonly event: string;
  readonly to: OrderState;
  readonly roles: readonly AppRole[];
}

export type OrderEvent = (typeof ORDER_TRANSITIONS)[number]["event"];

export type TransitionResult =
  | { readonly ok: true; readonly to: OrderState }
  | { readonly ok: false; readonly reason: "unknown_transition" | "role_not_allowed" };

/**
 * Fonction pure : calcule l'état suivant sans rien modifier.
 * Refuse tout passage absent de la table ou demandé par un rôle non autorisé.
 */
export function transition(from: OrderState, event: OrderEvent, role: AppRole): TransitionResult {
  const rule = ORDER_TRANSITIONS.find((t) => t.from === from && t.event === event);
  if (!rule) {
    return { ok: false, reason: "unknown_transition" };
  }
  if (!(rule.roles as readonly AppRole[]).includes(role)) {
    return { ok: false, reason: "role_not_allowed" };
  }
  return { ok: true, to: rule.to };
}

/** Événements qu'un rôle peut déclencher depuis un état donné, pour afficher les bonnes actions. */
export function allowedEvents(from: OrderState, role: AppRole): OrderEvent[] {
  return ORDER_TRANSITIONS.filter(
    (t) => t.from === from && (t.roles as readonly AppRole[]).includes(role),
  ).map((t) => t.event);
}
