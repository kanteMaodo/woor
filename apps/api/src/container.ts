import { createPool, type Pool } from "@woor/db";

import type {
  AuthUseCases,
  CourierUseCases,
  SellerUseCases,
} from "./application/account-use-cases";
import type { BuyerUseCases } from "./application/buyer-use-cases";
import { Authenticate } from "./application/use-cases/auth/authenticate";
import { GetProfile } from "./application/use-cases/auth/get-profile";
import { LogIn } from "./application/use-cases/auth/log-in";
import { LogOut } from "./application/use-cases/auth/log-out";
import { CancelBuyerOrder } from "./application/use-cases/cancel-buyer-order";
import { ClaimOrder } from "./application/use-cases/claim-order";
import { ConfirmPickup } from "./application/use-cases/courier/confirm-pickup";
import { GetDelivery } from "./application/use-cases/courier/get-delivery";
import { ListDeliveries } from "./application/use-cases/courier/list-deliveries";
import { SubmitDeliveryCode } from "./application/use-cases/courier/submit-delivery-code";
import { GetBuyerOrder } from "./application/use-cases/get-buyer-order";
import { GetPublicOrder } from "./application/use-cases/get-public-order";
import { RequestInvoices } from "./application/use-cases/request-invoices";
import { RevealDeliveryCode } from "./application/use-cases/reveal-delivery-code";
import { CancelSellerOrder } from "./application/use-cases/seller/cancel-seller-order";
import { CreateSellerOrder } from "./application/use-cases/seller/create-seller-order";
import { GetSellerOrder } from "./application/use-cases/seller/get-seller-order";
import { ListLinkedCouriers } from "./application/use-cases/seller/list-linked-couriers";
import { ListSellerOrders } from "./application/use-cases/seller/list-seller-orders";
import type { Env } from "./config/env";
import { AesGcmPiiCipher } from "./infrastructure/crypto/aes-gcm-pii-cipher";
import { NodeAuthSecrets } from "./infrastructure/crypto/node-auth-secrets";
import { NodeBuyerSecrets } from "./infrastructure/crypto/node-buyer-secrets";
import { PgAccounts } from "./infrastructure/postgres/pg-accounts";
import { PgBuyerOrders } from "./infrastructure/postgres/pg-buyer-orders";
import { PgCourierDeliveries } from "./infrastructure/postgres/pg-courier-deliveries";
import { PgSellerOrders } from "./infrastructure/postgres/pg-seller-orders";

export interface Container {
  pool: Pool;
  buyer: BuyerUseCases;
  auth: AuthUseCases;
  seller: SellerUseCases;
  courier: CourierUseCases;
}

const key = (base64: string) => Buffer.from(base64, "base64");

/** Racine de composition : le seul endroit qui connaît les implémentations concrètes. */
export function createContainer(env: Env): Container {
  const pool = createPool({ connectionString: env.API_DATABASE_URL, applicationName: "woor-api" });

  const linkSecrets = new NodeBuyerSecrets(key(env.CODE_HMAC_KEY));
  const authSecrets = new NodeAuthSecrets(key(env.PHONE_HMAC_KEY), key(env.PIN_PEPPER));
  const cipher = new AesGcmPiiCipher(key(env.PII_KEY), env.PII_KEY_ID);

  const buyerOrders = new PgBuyerOrders(pool);
  const accounts = new PgAccounts(pool);
  const sellerOrders = new PgSellerOrders(pool);
  const deliveries = new PgCourierDeliveries(pool);

  return {
    pool,
    buyer: {
      getPublicOrder: new GetPublicOrder(buyerOrders, linkSecrets),
      getBuyerOrder: new GetBuyerOrder(buyerOrders, linkSecrets),
      claimOrder: new ClaimOrder(buyerOrders, linkSecrets),
      requestInvoices: new RequestInvoices(buyerOrders, linkSecrets),
      revealDeliveryCode: new RevealDeliveryCode(buyerOrders, linkSecrets),
      cancelBuyerOrder: new CancelBuyerOrder(buyerOrders, linkSecrets),
    },
    auth: {
      logIn: new LogIn(accounts, authSecrets),
      authenticate: new Authenticate(accounts, authSecrets),
      logOut: new LogOut(accounts),
      getProfile: new GetProfile(accounts),
    },
    seller: {
      listLinkedCouriers: new ListLinkedCouriers(sellerOrders),
      createOrder: new CreateSellerOrder(sellerOrders, linkSecrets, cipher),
      listOrders: new ListSellerOrders(sellerOrders, cipher),
      getOrder: new GetSellerOrder(sellerOrders, cipher),
      cancelOrder: new CancelSellerOrder(sellerOrders),
    },
    courier: {
      listDeliveries: new ListDeliveries(deliveries, cipher),
      getDelivery: new GetDelivery(deliveries, cipher),
      confirmPickup: new ConfirmPickup(deliveries),
      submitDeliveryCode: new SubmitDeliveryCode(deliveries, linkSecrets),
    },
  };
}
