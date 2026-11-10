import {
  type AuthenticatedLnd,
  authenticatedLndGrpc,
  cancelHodlInvoice,
  createHodlInvoice,
  getInvoice,
  getPayment,
  getWalletInfo,
  payViaPaymentRequest,
  settleHodlInvoice,
  subscribeToInvoice,
} from "lightning";

import type {
  CreateHoldInvoiceParams,
  InvoiceSnapshot,
  InvoiceSubscriptionHandlers,
  LightningProvider,
  NodeInfo,
  PayInvoiceParams,
  PaymentResult,
  PaymentStatus,
  Unsubscribe,
} from "../lightning-provider";
import { callLnd, toLightningError } from "./lnd-errors";

export interface LndConnectionConfig {
  /** Adresse gRPC du nœud, par exemple "127.0.0.1:10009". */
  socket: string;
  /** Certificat TLS du nœud, encodé en base64. */
  certBase64: string;
  /** Macaron à droits réduits, encodé en base64 ou en hexadécimal. */
  macaroon: string;
}

/** Forme commune des factures renvoyées par getInvoice et subscribeToInvoice. */
interface LndInvoice {
  id: string;
  is_canceled?: boolean;
  is_confirmed: boolean;
  is_held?: boolean;
  received_mtokens: string;
  payments: { is_held: boolean; timeout: number }[];
}

export class LndLightningProvider implements LightningProvider {
  private constructor(private readonly lnd: AuthenticatedLnd) {}

  static connect(config: LndConnectionConfig): LndLightningProvider {
    const { lnd } = authenticatedLndGrpc({
      socket: config.socket,
      cert: config.certBase64,
      macaroon: config.macaroon,
    });
    return new LndLightningProvider(lnd);
  }

  async createHoldInvoice(params: CreateHoldInvoiceParams): Promise<{ bolt11: string }> {
    const invoice = await callLnd(() =>
      createHodlInvoice({
        lnd: this.lnd,
        id: params.hash.toString("hex"),
        mtokens: params.amountMsat.toString(),
        description: params.memo,
        expires_at: new Date(Date.now() + params.expirySec * 1000).toISOString(),
        cltv_delta: params.cltvDelta,
      }),
    );
    return { bolt11: invoice.request };
  }

  subscribeInvoice(paymentHash: Buffer, handlers: InvoiceSubscriptionHandlers): Unsubscribe {
    const subscription = subscribeToInvoice({ lnd: this.lnd, id: paymentHash.toString("hex") });
    subscription.on("invoice_updated", (invoice: LndInvoice) => {
      handlers.onUpdate(toSnapshot(invoice));
    });
    subscription.on("error", (raw: unknown) => {
      handlers.onError(toLightningError(raw));
    });
    return () => subscription.removeAllListeners();
  }

  async lookupInvoice(paymentHash: Buffer): Promise<InvoiceSnapshot | null> {
    try {
      const invoice = await callLnd(() =>
        getInvoice({ lnd: this.lnd, id: paymentHash.toString("hex") }),
      );
      return toSnapshot(invoice);
    } catch (error) {
      if (toLightningError(error).isNotFound) {
        return null;
      }
      throw error;
    }
  }

  async settleHoldInvoice(preimage: Buffer): Promise<void> {
    await callLnd(() => settleHodlInvoice({ lnd: this.lnd, secret: preimage.toString("hex") }));
  }

  async cancelHoldInvoice(paymentHash: Buffer): Promise<void> {
    await callLnd(() => cancelHodlInvoice({ lnd: this.lnd, id: paymentHash.toString("hex") }));
  }

  async payInvoice(params: PayInvoiceParams): Promise<PaymentResult> {
    try {
      const payment = await callLnd(() =>
        payViaPaymentRequest({
          lnd: this.lnd,
          request: params.bolt11,
          max_fee_mtokens: params.maxFeeMsat.toString(),
        }),
      );
      return {
        status: "succeeded",
        preimage: Buffer.from(payment.secret, "hex"),
        feeMsat: BigInt(payment.fee_mtokens),
      };
    } catch (error) {
      return { status: "failed", reason: toLightningError(error).message };
    }
  }

  async trackPayment(paymentHash: Buffer): Promise<PaymentStatus> {
    try {
      const result = await callLnd(() =>
        getPayment({ lnd: this.lnd, id: paymentHash.toString("hex") }),
      );
      if (result.is_confirmed) return "succeeded";
      if (result.is_failed) return "failed";
      return "in_flight";
    } catch (error) {
      if (toLightningError(error).isNotFound) {
        return "not_found";
      }
      throw error;
    }
  }

  async getInfo(): Promise<NodeInfo> {
    const info = await callLnd(() => getWalletInfo({ lnd: this.lnd }));
    return { blockHeight: info.current_block_height, synced: info.is_synced_to_chain };
  }
}

function toSnapshot(invoice: LndInvoice): InvoiceSnapshot {
  const heldExpiries = invoice.payments.filter((p) => p.is_held).map((p) => p.timeout);
  return {
    paymentHash: Buffer.from(invoice.id, "hex"),
    state: invoice.is_canceled
      ? "canceled"
      : invoice.is_confirmed
        ? "settled"
        : invoice.is_held
          ? "accepted"
          : "open",
    receivedMsat: BigInt(invoice.received_mtokens || "0"),
    minHtlcExpiryHeight: heldExpiries.length > 0 ? Math.min(...heldExpiries) : null,
  };
}
