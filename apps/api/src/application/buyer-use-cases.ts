import type { CancelBuyerOrder } from "./use-cases/cancel-buyer-order";
import type { ClaimOrder } from "./use-cases/claim-order";
import type { GetBuyerOrder } from "./use-cases/get-buyer-order";
import type { GetPublicOrder } from "./use-cases/get-public-order";
import type { RequestInvoices } from "./use-cases/request-invoices";
import type { RevealDeliveryCode } from "./use-cases/reveal-delivery-code";

/** Tout ce que l'acheteur peut faire, sans compte, avec le lien et son téléphone. */
export interface BuyerUseCases {
  getPublicOrder: GetPublicOrder;
  getBuyerOrder: GetBuyerOrder;
  claimOrder: ClaimOrder;
  requestInvoices: RequestInvoices;
  revealDeliveryCode: RevealDeliveryCode;
  cancelBuyerOrder: CancelBuyerOrder;
}
