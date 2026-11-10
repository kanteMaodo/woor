import { INVOICE_KINDS, type InvoiceKind, xofToMsat } from "@woor/core";
import type { LightningProvider } from "@woor/ln";

import type { InvoiceRepository, OrderToInvoice } from "../ports/invoice-repository";
import type { InvoiceWatchRegistry } from "../ports/invoice-watch";
import type { Logger } from "../ports/logger";
import type { PreimageVault } from "../ports/preimage-vault";
import type { SettingsReader } from "../ports/settings";
import type { QuoteExchangeRate } from "./quote-exchange-rate";

/** Libellés visibles dans le wallet de l'acheteur : aucune donnée personnelle. */
const MEMOS: Record<InvoiceKind, string> = {
  delivery_fee: "Wóor · frais de livraison",
  item: "Wóor · article",
};

/**
 * Tâche invoice.create : crée les hold invoices A (course) et B (article) d'une commande.
 * Idempotente : une facture déjà créée n'est jamais recréée.
 */
export class CreateOrderInvoices {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly lightning: LightningProvider,
    private readonly vault: PreimageVault,
    private readonly exchangeRate: QuoteExchangeRate,
    private readonly settings: SettingsReader,
    private readonly watcher: InvoiceWatchRegistry,
    private readonly logger: Logger,
  ) {}

  async execute(orderId: string): Promise<void> {
    const order = await this.invoices.findOrderToInvoice(orderId);
    if (!order || order.state !== "awaiting_payment") {
      this.logger.info({ orderId, state: order?.state }, "Commande plus payable : aucune facture");
      return;
    }

    const existing = await this.invoices.listInvoiceKinds(orderId);
    const missing = INVOICE_KINDS.filter((kind) => !existing.includes(kind));
    if (missing.length === 0) {
      return;
    }

    const [expirySec, cltvDelta, rate] = await Promise.all([
      this.settings.getInt("payment_window_sec"),
      this.settings.getInt("cltv_delta_blocks"),
      this.exchangeRate.execute(),
    ]);

    for (const kind of missing) {
      const amountXof = amountFor(order, kind);
      const amountMsat = xofToMsat(amountXof, rate.quote.xofPerBtcCents);
      const secret = this.vault.generate();

      const { bolt11 } = await this.lightning.createHoldInvoice({
        hash: secret.paymentHash,
        amountMsat,
        expirySec,
        cltvDelta,
        memo: MEMOS[kind],
      });

      await this.invoices.save({
        orderId,
        kind,
        paymentHash: secret.paymentHash,
        amountMsat,
        amountXof,
        fxQuoteId: rate.id,
        bolt11,
        expiresAt: new Date(Date.now() + expirySec * 1000),
        cltvDelta,
        sealedPreimage: this.vault.seal(secret),
      });

      this.watcher.watch(secret.paymentHash);
      this.logger.info({ orderId, kind, amountXof }, "Facture bloquée créée");
    }
  }
}

function amountFor(order: OrderToInvoice, kind: InvoiceKind): number {
  return kind === "item" ? order.itemPriceXof : order.deliveryFeeXof;
}
