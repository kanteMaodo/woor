import type { Authenticate } from "./use-cases/auth/authenticate";
import type { GetProfile } from "./use-cases/auth/get-profile";
import type { LogIn } from "./use-cases/auth/log-in";
import type { LogOut } from "./use-cases/auth/log-out";
import type { CancelSellerOrder } from "./use-cases/seller/cancel-seller-order";
import type { CreateSellerOrder } from "./use-cases/seller/create-seller-order";
import type { GetSellerOrder } from "./use-cases/seller/get-seller-order";
import type { ListLinkedCouriers } from "./use-cases/seller/list-linked-couriers";
import type { ListSellerOrders } from "./use-cases/seller/list-seller-orders";
import type { ConfirmPickup } from "./use-cases/courier/confirm-pickup";
import type { GetDelivery } from "./use-cases/courier/get-delivery";
import type { ListDeliveries } from "./use-cases/courier/list-deliveries";
import type { SubmitDeliveryCode } from "./use-cases/courier/submit-delivery-code";

/** Connexion et session, communes à tous les comptes. */
export interface AuthUseCases {
  logIn: LogIn;
  authenticate: Authenticate;
  logOut: LogOut;
  getProfile: GetProfile;
}

/** Ce que fait la vendeuse : créer, suivre et annuler ses commandes. */
export interface SellerUseCases {
  listLinkedCouriers: ListLinkedCouriers;
  createOrder: CreateSellerOrder;
  listOrders: ListSellerOrders;
  getOrder: GetSellerOrder;
  cancelOrder: CancelSellerOrder;
}

/** Ce que fait le livreur : ramasser, puis saisir le code à la remise. */
export interface CourierUseCases {
  listDeliveries: ListDeliveries;
  getDelivery: GetDelivery;
  confirmPickup: ConfirmPickup;
  submitDeliveryCode: SubmitDeliveryCode;
}
