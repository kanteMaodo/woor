import type { InvoiceKind, InvoiceState, OrderState } from "@woor/core";
import { type Pool, withTransaction } from "@woor/db";

import type {
  AcceptedPayment,
  InvoiceRepository,
  NewInvoice,
  OrderToInvoice,
  StoredInvoice,
} from "../../application/ports/invoice-repository";
import type { SealedPreimage } from "../../application/ports/preimage-vault";

interface InvoiceRow {
  id: string;
  order_id: string;
  kind: InvoiceKind;
  state: InvoiceState;
  payment_hash: Buffer;
}

export class PgInvoiceRepository implements InvoiceRepository {
  constructor(private readonly pool: Pool) {}

  async findOrderToInvoice(orderId: string): Promise<OrderToInvoice | null> {
    const { rows } = await this.pool.query<{
      id: string;
      state: OrderState;
      item_price_xof: number;
      delivery_fee_xof: number;
    }>(
      `SELECT id, state, item_price_xof, delivery_fee_xof
         FROM woor.orders
        WHERE id = $1`,
      [orderId],
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          state: row.state,
          itemPriceXof: row.item_price_xof,
          deliveryFeeXof: row.delivery_fee_xof,
        }
      : null;
  }

  async listInvoiceKinds(orderId: string): Promise<InvoiceKind[]> {
    const { rows } = await this.pool.query<{ kind: InvoiceKind }>(
      `SELECT kind FROM woor.invoices WHERE order_id = $1`,
      [orderId],
    );
    return rows.map((row) => row.kind);
  }

  async save(invoice: NewInvoice): Promise<void> {
    await withTransaction(this.pool, async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO woor.invoices
           (order_id, kind, payment_hash, amount_msat, amount_xof, fx_quote_id, bolt11,
            payment_request_expires_at, cltv_delta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          invoice.orderId,
          invoice.kind,
          invoice.paymentHash,
          invoice.amountMsat.toString(),
          invoice.amountXof,
          invoice.fxQuoteId,
          invoice.bolt11,
          invoice.expiresAt,
          invoice.cltvDelta,
        ],
      );
      const invoiceId = rows[0]?.id;
      if (!invoiceId) {
        throw new Error("Insertion de la facture sans identifiant");
      }

      await client.query(
        `INSERT INTO woor_secret.invoice_preimages (invoice_id, preimage_ct, nonce, key_id)
         VALUES ($1, $2, $3, $4)`,
        [
          invoiceId,
          invoice.sealedPreimage.ciphertext,
          invoice.sealedPreimage.nonce,
          invoice.sealedPreimage.keyId,
        ],
      );

      // La première facture fixe l'échéance de paiement de toute la commande.
      await client.query(
        `UPDATE woor.orders SET pay_deadline = coalesce(pay_deadline, $2) WHERE id = $1`,
        [invoice.orderId, invoice.expiresAt],
      );
    });
  }

  async findByOrder(orderId: string, kind: InvoiceKind): Promise<StoredInvoice | null> {
    const { rows } = await this.pool.query<InvoiceRow>(
      `SELECT id, order_id, kind, state, payment_hash
         FROM woor.invoices
        WHERE order_id = $1 AND kind = $2`,
      [orderId, kind],
    );
    const row = rows[0];
    return row ? toStoredInvoice(row) : null;
  }

  async loadSealedPreimage(invoiceId: string): Promise<SealedPreimage> {
    const { rows } = await this.pool.query<{ preimage_ct: Buffer; nonce: Buffer; key_id: number }>(
      `SELECT preimage_ct, nonce, key_id
         FROM woor_secret.invoice_preimages
        WHERE invoice_id = $1`,
      [invoiceId],
    );
    const row = rows[0];
    if (!row) {
      throw new Error("Secret de déblocage introuvable pour cette facture");
    }
    return { ciphertext: row.preimage_ct, nonce: row.nonce, keyId: row.key_id };
  }

  async listWatchedPaymentHashes(): Promise<Buffer[]> {
    const { rows } = await this.pool.query<{ payment_hash: Buffer }>(
      `SELECT payment_hash
         FROM woor.invoices
        WHERE state IN ('open', 'accepted', 'settling', 'cancelling')`,
    );
    return rows.map((row) => row.payment_hash);
  }

  async markAccepted(paymentHash: Buffer, payment: AcceptedPayment): Promise<boolean> {
    return this.update(
      `UPDATE woor.invoices
          SET state = 'accepted', accepted_at = now(),
              accept_height = $2, min_htlc_expiry_height = $3
        WHERE payment_hash = $1 AND state = 'open'`,
      [paymentHash, payment.acceptHeight, payment.minHtlcExpiryHeight],
    );
  }

  async markSettling(invoiceId: string): Promise<boolean> {
    return this.update(
      `UPDATE woor.invoices SET state = 'settling' WHERE id = $1 AND state = 'accepted'`,
      [invoiceId],
    );
  }

  async markSettled(paymentHash: Buffer): Promise<boolean> {
    return this.update(
      `UPDATE woor.invoices
          SET state = 'settled', settled_at = now()
        WHERE payment_hash = $1 AND state = 'settling'`,
      [paymentHash],
    );
  }

  async markCancelling(invoiceId: string): Promise<boolean> {
    return this.update(
      `UPDATE woor.invoices SET state = 'cancelling' WHERE id = $1 AND state IN ('open', 'accepted')`,
      [invoiceId],
    );
  }

  async markCancelled(paymentHash: Buffer, reason: string): Promise<boolean> {
    return this.update(
      `UPDATE woor.invoices
          SET state = 'cancelled', cancelled_at = now(), cancel_reason = left($2, 200)
        WHERE payment_hash = $1 AND state IN ('open', 'accepted', 'cancelling')`,
      [paymentHash, reason],
    );
  }

  /** Renvoie true si une ligne a changé, false si l'état était déjà atteint. */
  private async update(sql: string, params: unknown[]): Promise<boolean> {
    const result = await this.pool.query(sql, params);
    return (result.rowCount ?? 0) > 0;
  }
}

function toStoredInvoice(row: InvoiceRow): StoredInvoice {
  return {
    id: row.id,
    orderId: row.order_id,
    kind: row.kind,
    state: row.state,
    paymentHash: row.payment_hash,
  };
}
