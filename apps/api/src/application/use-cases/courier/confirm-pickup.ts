import type { OrderState } from "@woor/core";

import type { Actor } from "../../actor";
import type { CourierDeliveries } from "../../ports/courier-deliveries";

/**
 * Le livreur a le colis en main : la commande passe « en route ».
 * Pilote : simple confirmation. Le QR signé montré par la vendeuse viendra ensuite.
 */
export class ConfirmPickup {
  constructor(private readonly deliveries: CourierDeliveries) {}

  execute(actor: Actor, orderId: string): Promise<OrderState> {
    return this.deliveries.confirmPickup(actor, orderId);
  }
}
