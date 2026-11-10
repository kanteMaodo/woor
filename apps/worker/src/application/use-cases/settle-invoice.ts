import type { InvoiceKind } from "@woor/core";
import type { LightningProvider } from "@woor/ln";

import type { InvoiceRepository } from "../ports/invoice-repository";
import type { Logger } from "../ports/logger";
import type { PreimageVault } from "../ports/preimage-vault";

/**
 * Tâche invoice.settle : encaisse une facture bloquée.
 *
 * Ordre imposé : on écrit d'abord l'intention « settling » en base, puis on appelle le nœud,
 * puis on écrit « settled ». Après une panne, la tâche reprend et termine une seule fois.
 * La base refuse « settling » si la machine à états n'a pas décidé l'encaissement.
 */
export class SettleInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly lightning: LightningProvider,
    private readonly vault: PreimageVault,
    private readonly logger: Logger,
  ) {}

  async execute(orderId: string, kind: InvoiceKind): Promise<void> {
    const invoice = await this.invoices.findByOrder(orderId, kind);
    if (!invoice) {
      throw new Error(`Aucune facture « ${kind} » pour cette commande`);
    }

    switch (invoice.state) {
      case "settled":
        return;
      case "open":
      case "cancelling":
      case "cancelled":
        throw new Error(`Facture « ${kind} » ${invoice.state} : encaissement impossible`);
      case "accepted":
        await this.invoices.markSettling(invoice.id);
        break;
      case "settling":
        break;
    }

    const onNode = await this.lightning.lookupInvoice(invoice.paymentHash);
    if (onNode?.state !== "settled") {
      if (onNode?.state !== "accepted") {
        throw new Error(`Le nœud voit la facture « ${onNode?.state ?? "inconnue"} »`);
      }
      const sealed = await this.invoices.loadSealedPreimage(invoice.id);
      const preimage = this.vault.open(sealed, invoice.paymentHash);
      await this.lightning.settleHoldInvoice(preimage);
    }

    await this.invoices.markSettled(invoice.paymentHash);
    this.logger.info({ orderId, kind }, "Facture encaissée");
  }
}
