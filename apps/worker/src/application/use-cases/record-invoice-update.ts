import type { InvoiceSnapshot, LightningProvider } from "@woor/ln";

import type { InvoiceRepository } from "../ports/invoice-repository";
import type { Logger } from "../ports/logger";

/**
 * Reporte en base ce que le nœud dit d'une facture.
 * Les déclencheurs SQL font le reste : commande bloquée quand A et B le sont,
 * versements planifiés après règlement.
 */
export class RecordInvoiceUpdate {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly lightning: LightningProvider,
    private readonly logger: Logger,
  ) {}

  async execute(snapshot: InvoiceSnapshot): Promise<void> {
    const paymentHash = snapshot.paymentHash.toString("hex");

    switch (snapshot.state) {
      case "open":
        return;

      case "accepted": {
        const { blockHeight } = await this.lightning.getInfo();
        const changed = await this.invoices.markAccepted(snapshot.paymentHash, {
          acceptHeight: blockHeight,
          minHtlcExpiryHeight: snapshot.minHtlcExpiryHeight,
        });
        if (changed) {
          this.logger.info({ paymentHash, blockHeight }, "Paiement bloqué");
        }
        return;
      }

      case "settled": {
        if (await this.invoices.markSettled(snapshot.paymentHash)) {
          this.logger.info({ paymentHash }, "Paiement encaissé");
        }
        return;
      }

      case "canceled": {
        if (await this.invoices.markCancelled(snapshot.paymentHash, "node_canceled")) {
          // Annulation venue du nœud lui-même : expiration ou filet de sécurité de LND.
          this.logger.warn({ paymentHash }, "Facture annulée par le nœud");
        }
        return;
      }
    }
  }
}
