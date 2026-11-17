import type { OrderState } from "@woor/core";
import { type Pool, type PoolClient, withContext } from "@woor/db";

import type { Actor } from "../../application/actor";
import type {
  CodeCheck,
  CourierDeliveries,
  DeliveryRecord,
} from "../../application/ports/courier-deliveries";
import { contextOf } from "./pg-accounts";
import { withPgErrors } from "./pg-errors";

interface DeliveryRow {
  id: string;
  item_label: string;
  delivery_fee_xof: number;
  state: OrderState;
  seller_name: string;
  address_enc: Buffer | null;
  address_key_id: number | null;
  locked_at: Date | null;
  pickup_deadline: Date | null;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  closed_at: Date | null;
  code_attempts: number;
  code_locked_at: Date | null;
}

/**
 * Le livreur ne voit une commande qu'une fois l'argent bloqué : avant, rien n'est à ramasser.
 * La RLS (orders_api_select) limite déjà la liste aux courses qui lui sont confiées.
 */
const SELECT_DELIVERIES = `
  SELECT o.id, o.item_label, o.delivery_fee_xof, o.state, s.display_name AS seller_name,
         o.address_enc, o.address_key_id, o.locked_at, o.pickup_deadline, o.picked_up_at,
         o.delivered_at, o.closed_at, o.code_attempts, o.code_locked_at
    FROM woor.orders o
    JOIN woor.users s ON s.id = o.seller_id
   WHERE o.locked_at IS NOT NULL`;

export class PgCourierDeliveries implements CourierDeliveries {
  constructor(private readonly pool: Pool) {}

  list(actor: Actor): Promise<DeliveryRecord[]> {
    return this.asCourier(actor, async (client) => {
      const { rows } = await client.query<DeliveryRow>(
        `${SELECT_DELIVERIES} ORDER BY o.locked_at DESC NULLS LAST LIMIT 100`,
      );
      return rows.map(toRecord);
    });
  }

  find(actor: Actor, orderId: string): Promise<DeliveryRecord | null> {
    return this.asCourier(actor, async (client) => {
      const { rows } = await client.query<DeliveryRow>(`${SELECT_DELIVERIES} AND o.id = $1`, [
        orderId,
      ]);
      const row = rows[0];
      return row ? toRecord(row) : null;
    });
  }

  confirmPickup(actor: Actor, orderId: string): Promise<OrderState> {
    return this.asCourier(actor, async (client) => {
      const { rows } = await client.query<{ state: OrderState }>(
        `SELECT woor.confirm_pickup($1) AS state`,
        [orderId],
      );
      const state = rows[0]?.state;
      if (!state) {
        throw new Error("Ramassage sans nouvel état");
      }
      return state;
    });
  }

  verifyCode(actor: Actor, orderId: string, codeHmac: Buffer): Promise<CodeCheck> {
    // La transaction est validée même si le code est faux : l'essai doit rester compté.
    return this.asCourier(actor, async (client) => {
      const { rows } = await client.query<{ result: CodeCheck }>(
        `SELECT woor.verify_delivery_code($1, $2) AS result`,
        [orderId, codeHmac],
      );
      return rows[0]?.result ?? "not_allowed";
    });
  }

  private asCourier<T>(actor: Actor, run: (client: PoolClient) => Promise<T>): Promise<T> {
    return withPgErrors(() => withContext(this.pool, contextOf(actor), run));
  }
}

function toRecord(row: DeliveryRow): DeliveryRecord {
  return {
    id: row.id,
    itemLabel: row.item_label,
    deliveryFeeXof: row.delivery_fee_xof,
    state: row.state,
    sellerName: row.seller_name,
    address:
      row.address_enc && row.address_key_id !== null
        ? { ciphertext: row.address_enc, keyId: row.address_key_id }
        : null,
    lockedAt: row.locked_at,
    pickupDeadline: row.pickup_deadline,
    pickedUpAt: row.picked_up_at,
    deliveredAt: row.delivered_at,
    closedAt: row.closed_at,
    codeAttempts: row.code_attempts,
    codeLocked: row.code_locked_at !== null,
  };
}
