import type { Actor } from "../../actor";
import { NotFoundError } from "../../errors";
import type { CourierDeliveries } from "../../ports/courier-deliveries";
import type { PiiCipher } from "../../ports/pii-cipher";
import { type DeliveryView, toDeliveryView } from "./delivery-view";

/** GET /v1/courier/orders/:id : une course du livreur, ou « introuvable ». */
export class GetDelivery {
  constructor(
    private readonly deliveries: CourierDeliveries,
    private readonly cipher: PiiCipher,
  ) {}

  async execute(actor: Actor, orderId: string): Promise<DeliveryView> {
    const record = await this.deliveries.find(actor, orderId);
    if (!record) {
      throw new NotFoundError();
    }
    return toDeliveryView(this.cipher, record);
  }
}
