import type { InvoiceSnapshot, LightningProvider, Unsubscribe } from "@woor/ln";

import type { InvoiceWatchRegistry } from "../application/ports/invoice-watch";
import type { Logger } from "../application/ports/logger";
import type { RecordInvoiceUpdate } from "../application/use-cases/record-invoice-update";

const RESUBSCRIBE_DELAY_MS = 5_000;

/**
 * Suit chaque facture ouverte auprès du nœud et reporte ses changements en base.
 * Au démarrage, il reprend toutes les factures en cours : un événement manqué pendant
 * une panne est rattrapé, car le nœud renvoie l'état actuel à chaque abonnement.
 */
export class InvoiceWatcher implements InvoiceWatchRegistry {
  private readonly subscriptions = new Map<string, Unsubscribe>();
  private stopped = false;

  constructor(
    private readonly lightning: LightningProvider,
    private readonly recordUpdate: RecordInvoiceUpdate,
    private readonly logger: Logger,
  ) {}

  resume(paymentHashes: readonly Buffer[]): void {
    for (const paymentHash of paymentHashes) {
      this.watch(paymentHash);
    }
    this.logger.info({ count: paymentHashes.length }, "Suivi des factures repris");
  }

  watch(paymentHash: Buffer): void {
    const key = paymentHash.toString("hex");
    if (this.stopped || this.subscriptions.has(key)) {
      return;
    }

    const unsubscribe = this.lightning.subscribeInvoice(paymentHash, {
      onUpdate: (snapshot) => void this.handleUpdate(key, snapshot),
      onError: (error) => {
        this.logger.warn({ paymentHash: key, err: error }, "Suivi de facture interrompu");
        this.forget(key);
        setTimeout(() => this.watch(paymentHash), RESUBSCRIBE_DELAY_MS).unref();
      },
    });
    this.subscriptions.set(key, unsubscribe);
  }

  stop(): void {
    this.stopped = true;
    for (const key of [...this.subscriptions.keys()]) {
      this.forget(key);
    }
  }

  private async handleUpdate(key: string, snapshot: InvoiceSnapshot): Promise<void> {
    try {
      await this.recordUpdate.execute(snapshot);
      if (snapshot.state === "settled" || snapshot.state === "canceled") {
        this.forget(key);
      }
    } catch (error) {
      this.logger.error({ paymentHash: key, err: error }, "Mise à jour de facture impossible");
    }
  }

  private forget(key: string): void {
    this.subscriptions.get(key)?.();
    this.subscriptions.delete(key);
  }
}
