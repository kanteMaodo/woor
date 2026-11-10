import { createPool, type Pool } from "@woor/db";
import { type LightningProvider, LndLightningProvider } from "@woor/ln";

import type { Logger } from "./application/ports/logger";
import { CancelInvoice } from "./application/use-cases/cancel-invoice";
import { CreateOrderInvoices } from "./application/use-cases/create-order-invoices";
import { QuoteExchangeRate } from "./application/use-cases/quote-exchange-rate";
import { RecordInvoiceUpdate } from "./application/use-cases/record-invoice-update";
import { RunMaintenance } from "./application/use-cases/run-maintenance";
import { SettleInvoice } from "./application/use-cases/settle-invoice";
import type { Env } from "./config/env";
import {
  AesGcmPreimageVault,
  parsePreimageKeys,
} from "./infrastructure/crypto/aes-gcm-preimage-vault";
import { createFxSources } from "./infrastructure/fx/fx-sources";
import { PgFxQuoteRepository } from "./infrastructure/postgres/pg-fx-quote-repository";
import { PgInvoiceRepository } from "./infrastructure/postgres/pg-invoice-repository";
import { PgJobQueue } from "./infrastructure/postgres/pg-job-queue";
import { PgMaintenanceTasks } from "./infrastructure/postgres/pg-maintenance-tasks";
import { PgSettingsReader } from "./infrastructure/postgres/pg-settings-reader";
import { InvoiceWatcher } from "./runtime/invoice-watcher";
import { createJobHandlers } from "./runtime/job-handlers";
import { OutboxRunner } from "./runtime/outbox-runner";

export interface Container {
  pool: Pool;
  lightning: LightningProvider;
  invoices: PgInvoiceRepository;
  watcher: InvoiceWatcher;
  outboxRunner: OutboxRunner;
  maintenance: RunMaintenance;
}

/**
 * Racine de composition : le seul endroit qui connaît les implémentations concrètes.
 * Les cas d'usage reçoivent leurs dépendances ici et ne savent rien de PostgreSQL ni de LND.
 */
export function createContainer(env: Env, logger: Logger): Container {
  const pool = createPool({ connectionString: env.DATABASE_URL, applicationName: "woor-worker" });
  const lightning = LndLightningProvider.connect({
    socket: env.LND_SOCKET,
    certBase64: env.LND_CERT_BASE64,
    macaroon: env.LND_MACAROON,
  });
  const vault = new AesGcmPreimageVault(
    parsePreimageKeys(env.PREIMAGE_KEYS),
    env.PREIMAGE_ACTIVE_KEY_ID,
  );

  const invoices = new PgInvoiceRepository(pool);
  const settings = new PgSettingsReader(pool);
  const exchangeRate = new QuoteExchangeRate(
    createFxSources(),
    new PgFxQuoteRepository(pool),
    logger,
  );

  const watcher = new InvoiceWatcher(
    lightning,
    new RecordInvoiceUpdate(invoices, lightning, logger),
    logger,
  );

  const handlers = createJobHandlers({
    createOrderInvoices: new CreateOrderInvoices(
      invoices,
      lightning,
      vault,
      exchangeRate,
      settings,
      watcher,
      logger,
    ),
    settleInvoice: new SettleInvoice(invoices, lightning, vault, logger),
    cancelInvoice: new CancelInvoice(invoices, lightning, logger),
  });

  return {
    pool,
    lightning,
    invoices,
    watcher,
    outboxRunner: new OutboxRunner(new PgJobQueue(pool), handlers, logger, {
      pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
    }),
    maintenance: new RunMaintenance(new PgMaintenanceTasks(pool), logger),
  };
}
