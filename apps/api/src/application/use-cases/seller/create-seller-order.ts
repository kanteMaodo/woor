import type { Actor } from "../../actor";
import { type DeliveryAddress, sealAddress } from "../../delivery-address";
import type { OrderLinks } from "../../ports/order-links";
import type { PiiCipher } from "../../ports/pii-cipher";
import type { SellerOrders } from "../../ports/seller-orders";

export interface CreateSellerOrderInput {
  itemLabel: string;
  itemPriceXof: number;
  deliveryFeeXof: number;
  courierId: string;
  address: DeliveryAddress;
}

export interface CreatedOrder {
  orderId: string;
  /** Jeton du lien, rendu une seule fois : la base n'en garde que l'empreinte. */
  orderToken: string;
}

/**
 * La vendeuse crée une commande et reçoit le lien à envoyer à l'acheteur.
 * La base vérifie le livreur choisi, les plafonds et l'interrupteur général.
 */
export class CreateSellerOrder {
  constructor(
    private readonly orders: SellerOrders,
    private readonly links: OrderLinks,
    private readonly cipher: PiiCipher,
  ) {}

  async execute(actor: Actor, input: CreateSellerOrderInput): Promise<CreatedOrder> {
    const orderToken = this.links.newOrderToken();
    const orderId = await this.orders.create(actor, {
      tokenHash: this.links.hashOrderToken(orderToken),
      courierId: input.courierId,
      itemLabel: input.itemLabel,
      itemPriceXof: input.itemPriceXof,
      deliveryFeeXof: input.deliveryFeeXof,
      address: sealAddress(this.cipher, input.address),
    });
    return { orderId, orderToken };
  }
}
