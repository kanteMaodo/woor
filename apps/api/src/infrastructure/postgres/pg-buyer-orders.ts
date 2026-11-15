import type { InvoiceKind, InvoiceState, OrderState } from "@woor/core";
import { type Pool, type PoolClient, withContext } from "@woor/db";

import type {
  BuyerInvoice,
  BuyerOrders,
  BuyerOrderView,
  InvoiceRequestStatus,
  PublicOrderSummary,
} from "../../application/ports/buyer-orders";
import { withPgErrors } from "./pg-errors";

interface SummaryRow {
  seller_name: string;
  seller_successful_deliveries: string;
  item_label: string;
  item_price_xof: number;
  delivery_fee_xof: number;
  total_xof: number;
  state: OrderState;
  claimed: boolean;
  courier_first_name: string | null;
  courier_phone_last2: string | null;
}

interface OrderRow {
  pay_deadline: Date | null;
  locked_at: Date | null;
  picked_up_at: Date | null;
  arrived_at: Date | null;
  delivered_at: Date | null;
  closed_at: Date | null;
  hard_stop_at: Date | null;
  refusal_declared_at: Date | null;
  no_show_declared_at: Date | null;
  contest_deadline: Date | null;
  code_issued_at: Date | null;
}

interface InvoiceRow {
  kind: InvoiceKind;
  state: InvoiceState;
  bolt11: string;
  amount_xof: number;
  amount_msat: string;
  payment_request_expires_at: Date;
}

/**
 * Commandes côté acheteur. Les lectures et écritures liées à une commande se font dans une
 * transaction qui pose le contexte « acheteur de cette commande » : la RLS et les fonctions
 * SECURITY DEFINER du schéma vérifient alors elles-mêmes le droit.
 */
export class PgBuyerOrders implements BuyerOrders {
  constructor(private readonly pool: Pool) {}

  async findPublicSummary(tokenHash: Buffer): Promise<PublicOrderSummary | null> {
    const row = await this.querySummary(this.pool, tokenHash);
    return row ? toPublicSummary(row) : null;
  }

  claim(tokenHash: Buffer, deviceHash: Buffer): Promise<string | null> {
    return withPgErrors(async () => {
      const { rows } = await this.pool.query<{ id: string | null }>(
        `SELECT woor.claim_order($1, $2) AS id`,
        [tokenHash, deviceHash],
      );
      return rows[0]?.id ?? null;
    });
  }

  async findBoundOrderId(tokenHash: Buffer, deviceHash: Buffer): Promise<string | null> {
    const { rows } = await this.pool.query<{ id: string | null }>(
      `SELECT woor.buyer_order($1, $2) AS id`,
      [tokenHash, deviceHash],
    );
    return rows[0]?.id ?? null;
  }

  getView(orderId: string, tokenHash: Buffer): Promise<BuyerOrderView> {
    return this.asBuyer(orderId, async (client) => {
      const summary = await this.querySummary(client, tokenHash);
      const { rows: orders } = await client.query<OrderRow>(
        `SELECT pay_deadline, locked_at, picked_up_at, arrived_at, delivered_at, closed_at,
                hard_stop_at, refusal_declared_at, no_show_declared_at, contest_deadline,
                code_issued_at
           FROM woor.orders
          WHERE id = $1`,
        [orderId],
      );
      const order = orders[0];
      if (!summary || !order) {
        throw new Error("Commande liée introuvable");
      }

      const { rows: invoices } = await client.query<InvoiceRow>(
        `SELECT kind, state, bolt11, amount_xof, amount_msat, payment_request_expires_at
           FROM woor.invoices
          WHERE order_id = $1
          ORDER BY kind`,
        [orderId],
      );

      return {
        ...toPublicSummary(summary),
        courierFirstName: summary.courier_first_name,
        courierPhoneLast2: summary.courier_phone_last2,
        payDeadline: iso(order.pay_deadline),
        lockedAt: iso(order.locked_at),
        pickedUpAt: iso(order.picked_up_at),
        arrivedAt: iso(order.arrived_at),
        deliveredAt: iso(order.delivered_at),
        closedAt: iso(order.closed_at),
        hardStopAt: iso(order.hard_stop_at),
        refusalDeclaredAt: iso(order.refusal_declared_at),
        noShowDeclaredAt: iso(order.no_show_declared_at),
        contestDeadline: iso(order.contest_deadline),
        codeIssued: order.code_issued_at !== null,
        invoices: invoices.map(toBuyerInvoice),
      };
    });
  }

  requestInvoices(orderId: string): Promise<InvoiceRequestStatus> {
    return this.asBuyer(orderId, async (client) => {
      const { rows } = await client.query<{ status: InvoiceRequestStatus }>(
        `SELECT woor.request_invoices($1) AS status`,
        [orderId],
      );
      return rows[0]?.status ?? "pending";
    });
  }

  issueDeliveryCode(orderId: string, deviceHash: Buffer, codeHmac: Buffer): Promise<boolean> {
    return this.asBuyer(orderId, async (client) => {
      const { rows } = await client.query<{ issued: boolean }>(
        `SELECT woor.issue_delivery_code($1, $2, $3) AS issued`,
        [orderId, deviceHash, codeHmac],
      );
      return rows[0]?.issued ?? false;
    });
  }

  cancel(orderId: string): Promise<OrderState> {
    return this.asBuyer(orderId, async (client) => {
      const { rows } = await client.query<{ state: OrderState }>(
        `SELECT woor.cancel_order($1, $2) AS state`,
        [orderId, "Annulée par l'acheteur"],
      );
      const state = rows[0]?.state;
      if (!state) {
        throw new Error("Annulation sans nouvel état");
      }
      return state;
    });
  }

  private asBuyer<T>(orderId: string, run: (client: PoolClient) => Promise<T>): Promise<T> {
    return withPgErrors(() =>
      withContext(this.pool, { role: "buyer", buyerOrderId: orderId }, run),
    );
  }

  private async querySummary(db: Pool | PoolClient, tokenHash: Buffer): Promise<SummaryRow | null> {
    const { rows } = await db.query<SummaryRow>(
      `SELECT seller_name, seller_successful_deliveries, item_label, item_price_xof,
              delivery_fee_xof, total_xof, state, claimed, courier_first_name, courier_phone_last2
         FROM woor.public_order_summary($1)`,
      [tokenHash],
    );
    return rows[0] ?? null;
  }
}

function toPublicSummary(row: SummaryRow): PublicOrderSummary {
  return {
    sellerName: row.seller_name,
    sellerSuccessfulDeliveries: Number(row.seller_successful_deliveries),
    itemLabel: row.item_label,
    itemPriceXof: row.item_price_xof,
    deliveryFeeXof: row.delivery_fee_xof,
    totalXof: row.total_xof,
    state: row.state,
    claimed: row.claimed,
  };
}

function toBuyerInvoice(row: InvoiceRow): BuyerInvoice {
  return {
    kind: row.kind,
    state: row.state,
    bolt11: row.bolt11,
    amountXof: row.amount_xof,
    amountSats: Number(BigInt(row.amount_msat) / 1000n),
    expiresAt: row.payment_request_expires_at.toISOString(),
  };
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
