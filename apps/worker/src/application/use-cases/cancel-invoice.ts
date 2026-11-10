import type { InvoiceKind } from "@woor/core";
import type { LightningProvider } from "@woor/ln";

import type { InvoiceRepository } from "../ports/invoice-repository";
import type { Logger } from "../ports/logger";

/**
 * Tâche invoice.cancel : rend les fonds bloqués à l'acheteur, sans frais.
 * Même principe que le règlement : intention écrite en base, appel au nœud, puis état final.
 */
export class CancelInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly lightning: LightningProvider,
    private readonly logger: Logger,
  ) {}

  async execute(orderId: string, kind: InvoiceKind, reason: string): Promise<void> {
    const invoice = await this.invoices.findByOrder(orderId, kind);
    if (!invoice) {
      // Commande expirée avant la création des factures : rien à rendre.
      return;
    }

    switch (invoice.state) {
      case "settled":
      case "cancelled":
        return;
      case "settling":
        throw new Error("Encaissement en cours : seule une décision d'arbitre peut l'arrêter");
      case "open":
      case "accepted":
        await this.invoices.markCancelling(invoice.id);
        break;
      case "cancelling":
        break;
    }

    const onNode = await this.lightning.lookupInvoice(invoice.paymentHash);
    if (onNode?.state === "settled") {
      throw new Error("Le nœud a déjà encaissé cette facture : annulation impossible");
    }
    if (onNode && onNode.state !== "canceled") {
      await this.lightning.cancelHoldInvoice(invoice.paymentHash);
    }

    await this.invoices.markCancelled(invoice.paymentHash, reason);
    this.logger.info({ orderId, kind, reason }, "Facture annulée, fonds rendus");
  }
}
