/** Demande au service de suivre une facture auprès du nœud. */
export interface InvoiceWatchRegistry {
  watch(paymentHash: Buffer): void;
}
