import type { Actor } from "../../actor";
import type { CourierDeliveries } from "../../ports/courier-deliveries";
import type { PiiCipher } from "../../ports/pii-cipher";
import { type DeliveryView, toDeliveryView } from "./delivery-view";

/** GET /v1/courier/orders : les courses confiées au livreur. */
export class ListDeliveries {
  constructor(
    private readonly deliveries: CourierDeliveries,
    private readonly cipher: PiiCipher,
  ) {}

  async execute(actor: Actor): Promise<DeliveryView[]> {
    const records = await this.deliveries.list(actor);
    return records.map((record) => toDeliveryView(this.cipher, record));
  }
}
