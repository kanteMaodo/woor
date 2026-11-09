/** Miroir de l'énumération SQL woor.order_state. */
export const ORDER_STATES = [
  "awaiting_payment",
  "locked",
  "in_transit",
  "disputed",
  "delivered",
  "paid_out",
  "courier_paid",
  "refunded",
  "expired",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

/** États finaux : plus aucune transition n'en part, sauf "delivered" qui attend ses versements. */
export const CLOSED_ORDER_STATES = [
  "paid_out",
  "courier_paid",
  "refunded",
  "expired",
] as const satisfies readonly OrderState[];

export function isClosedOrderState(state: OrderState): boolean {
  return (CLOSED_ORDER_STATES as readonly OrderState[]).includes(state);
}
