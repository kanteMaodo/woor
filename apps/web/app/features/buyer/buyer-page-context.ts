import type { InvoiceKind } from "@woor/core";

/** Ce dont les écrans ont besoin en plus des données de la commande. */
export interface BuyerPageContext {
  orderToken: string;
  /** Heure du serveur au chargement : les comptes à rebours sont identiques côté serveur et téléphone. */
  now: string;
  /** QR code SVG de chaque facture à payer, fabriqué par le serveur. */
  qr: Partial<Record<InvoiceKind, string>>;
  /** Adresse pour rouvrir la page dans Chrome sur Android. */
  chromeIntentUrl: string;
  pageUrl: string;
  revealedCode: string | null;
  error: string | null;
}
