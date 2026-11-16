import { createPool, type Pool } from "@woor/db";

import type { BuyerUseCases } from "./application/buyer-use-cases";
import { CancelBuyerOrder } from "./application/use-cases/cancel-buyer-order";
import { ClaimOrder } from "./application/use-cases/claim-order";
import { GetBuyerOrder } from "./application/use-cases/get-buyer-order";
import { GetPublicOrder } from "./application/use-cases/get-public-order";
import { RequestInvoices } from "./application/use-cases/request-invoices";
import { RevealDeliveryCode } from "./application/use-cases/reveal-delivery-code";
import type { Env } from "./config/env";
import { NodeBuyerSecrets } from "./infrastructure/crypto/node-buyer-secrets";
import { PgBuyerOrders } from "./infrastructure/postgres/pg-buyer-orders";

export interface Container {
  pool: Pool;
  buyer: BuyerUseCases;
}

/** Racine de composition : le seul endroit qui connaît les implémentations concrètes. */
export function createContainer(env: Env): Container {
  const pool = createPool({ connectionString: env.API_DATABASE_URL, applicationName: "woor-api" });
  const orders = new PgBuyerOrders(pool);
  const secrets = new NodeBuyerSecrets(Buffer.from(env.CODE_HMAC_KEY, "base64"));

  return {
    pool,
    buyer: {
      getPublicOrder: new GetPublicOrder(orders, secrets),
      getBuyerOrder: new GetBuyerOrder(orders, secrets),
      claimOrder: new ClaimOrder(orders, secrets),
      requestInvoices: new RequestInvoices(orders, secrets),
      revealDeliveryCode: new RevealDeliveryCode(orders, secrets),
      cancelBuyerOrder: new CancelBuyerOrder(orders, secrets),
    },
  };
}
