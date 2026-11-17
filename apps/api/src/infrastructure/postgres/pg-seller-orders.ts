import type { OrderState } from "@woor/core";
import { type Pool, type PoolClient, withContext } from "@woor/db";

import type { Actor } from "../../application/actor";
import type {
  LinkedCourier,
  NewOrderRecord,
  SellerOrderRecord,
  SellerOrders,
} from "../../application/ports/seller-orders";
import { contextOf } from "./pg-accounts";
import { withPgErrors } from "./pg-errors";

interface OrderRow {
  id: string;
  item_label: string;
  item_price_xof: number;
  delivery_fee_xof: number;
  total_xof: number;
  state: OrderState;
  courier_name: string;
  address_enc: Buffer | null;
  address_key_id: number | null;
  created_at: Date;
  claimed_at: Date | null;
  locked_at: Date | null;
  picked_up_at: Date | null;
  arrived_at: Date | null;
  delivered_at: Date | null;
  closed_at: Date | null;
}

/** La RLS (orders_api_select) ne laisse voir à la vendeuse que ses propres commandes. */
const SELECT_ORDERS = `
  SELECT o.id, o.item_label, o.item_price_xof, o.delivery_fee_xof, o.total_xof, o.state,
         c.display_name AS courier_name, o.address_enc, o.address_key_id, o.created_at,
         o.claimed_at, o.locked_at, o.picked_up_at, o.arrived_at, o.delivered_at, o.closed_at
    FROM woor.orders o
    JOIN woor.users c ON c.id = o.courier_id`;

export class PgSellerOrders implements SellerOrders {
  constructor(private readonly pool: Pool) {}

  listCouriers(actor: Actor): Promise<LinkedCourier[]> {
    return this.asSeller(actor, async (client) => {
      const { rows } = await client.query<{
        id: string;
        display_name: string;
        phone_last2: string;
      }>(
        `SELECT u.id, u.display_name, u.phone_last2
           FROM woor.seller_couriers sc
           JOIN woor.users u ON u.id = sc.courier_id
          WHERE sc.seller_id = $1 AND u.status = 'active'
          ORDER BY u.display_name`,
        [actor.userId],
      );
      return rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        phoneLast2: row.phone_last2,
      }));
    });
  }

  create(actor: Actor, order: NewOrderRecord): Promise<string> {
    return this.asSeller(actor, async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO woor.orders (public_token_hash, seller_id, courier_id, item_label,
                                  item_price_xof, delivery_fee_xof, address_enc, address_key_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          order.tokenHash,
          actor.userId,
          order.courierId,
          order.itemLabel,
          order.itemPriceXof,
          order.deliveryFeeXof,
          order.address.ciphertext,
          order.address.keyId,
        ],
      );
      const id = rows[0]?.id;
      if (!id) {
        throw new Error("Commande non créée");
      }
      return id;
    });
  }

  list(actor: Actor): Promise<SellerOrderRecord[]> {
    return this.asSeller(actor, async (client) => {
      const { rows } = await client.query<OrderRow>(
        `${SELECT_ORDERS} ORDER BY o.created_at DESC LIMIT 100`,
      );
      return rows.map(toRecord);
    });
  }

  find(actor: Actor, orderId: string): Promise<SellerOrderRecord | null> {
    return this.asSeller(actor, async (client) => {
      const { rows } = await client.query<OrderRow>(`${SELECT_ORDERS} WHERE o.id = $1`, [orderId]);
      const row = rows[0];
      return row ? toRecord(row) : null;
    });
  }

  cancel(actor: Actor, orderId: string): Promise<OrderState> {
    return this.asSeller(actor, async (client) => {
      const { rows } = await client.query<{ state: OrderState }>(
        `SELECT woor.cancel_order($1, $2) AS state`,
        [orderId, "Annulée par la vendeuse"],
      );
      const state = rows[0]?.state;
      if (!state) {
        throw new Error("Annulation sans nouvel état");
      }
      return state;
    });
  }

  private asSeller<T>(actor: Actor, run: (client: PoolClient) => Promise<T>): Promise<T> {
    return withPgErrors(() => withContext(this.pool, contextOf(actor), run));
  }
}

function toRecord(row: OrderRow): SellerOrderRecord {
  return {
    id: row.id,
    itemLabel: row.item_label,
    itemPriceXof: row.item_price_xof,
    deliveryFeeXof: row.delivery_fee_xof,
    totalXof: row.total_xof,
    state: row.state,
    courierName: row.courier_name,
    address:
      row.address_enc && row.address_key_id !== null
        ? { ciphertext: row.address_enc, keyId: row.address_key_id }
        : null,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    lockedAt: row.locked_at,
    pickedUpAt: row.picked_up_at,
    arrivedAt: row.arrived_at,
    deliveredAt: row.delivered_at,
    closedAt: row.closed_at,
  };
}
