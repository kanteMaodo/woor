import { INVOICE_KINDS } from "@woor/core";
import { z } from "zod";

import type { Job } from "../application/ports/job-queue";
import type { CancelInvoice } from "../application/use-cases/cancel-invoice";
import type { CreateOrderInvoices } from "../application/use-cases/create-order-invoices";
import type { SettleInvoice } from "../application/use-cases/settle-invoice";

export type JobHandler = (job: Job) => Promise<void>;

const InvoicePayload = z.object({ kind: z.enum(INVOICE_KINDS) });

export interface JobHandlerDependencies {
  createOrderInvoices: CreateOrderInvoices;
  settleInvoice: SettleInvoice;
  cancelInvoice: CancelInvoice;
}

/**
 * Aiguillage des sujets de woor.outbox vers les cas d'usage.
 * Les sujets absents (payout.run, notify.*) restent dans la file pour plus tard.
 */
export function createJobHandlers(deps: JobHandlerDependencies): ReadonlyMap<string, JobHandler> {
  return new Map<string, JobHandler>([
    ["invoice.create", (job) => deps.createOrderInvoices.execute(requireOrderId(job))],
    [
      "invoice.settle",
      (job) =>
        deps.settleInvoice.execute(requireOrderId(job), InvoicePayload.parse(job.payload).kind),
    ],
    [
      "invoice.cancel",
      (job) =>
        deps.cancelInvoice.execute(
          requireOrderId(job),
          InvoicePayload.parse(job.payload).kind,
          "order_closed",
        ),
    ],
  ]);
}

function requireOrderId(job: Job): string {
  if (!job.orderId) {
    throw new Error(`La tâche ${job.topic} n'a pas de commande`);
  }
  return job.orderId;
}
