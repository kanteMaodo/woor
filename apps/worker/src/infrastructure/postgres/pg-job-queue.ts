import type { Pool } from "@woor/db";

import type { Job, JobQueue } from "../../application/ports/job-queue";

/** Durée de réservation d'une tâche : passé ce délai, une autre instance peut la reprendre. */
const LOCK_SEC = 120;

/** File de tâches portée par la table woor.outbox, écrite dans la même transaction que l'état. */
export class PgJobQueue implements JobQueue {
  constructor(private readonly pool: Pool) {}

  async claim(topics: readonly string[], limit: number): Promise<Job[]> {
    const { rows } = await this.pool.query<{
      id: string;
      topic: string;
      order_id: string | null;
      payload: unknown;
      attempts: number;
    }>(
      `WITH next AS (
         SELECT id
           FROM woor.outbox
          WHERE processed_at IS NULL
            AND available_at <= now()
            AND (locked_until IS NULL OR locked_until < now())
            AND topic = ANY ($1::text[])
          ORDER BY id
          LIMIT $2
          FOR UPDATE SKIP LOCKED
       )
       UPDATE woor.outbox o
          SET locked_until = now() + make_interval(secs => $3),
              attempts = o.attempts + 1
         FROM next
        WHERE o.id = next.id
       RETURNING o.id, o.topic, o.order_id, o.payload, o.attempts`,
      [topics, limit, LOCK_SEC],
    );
    return rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      orderId: row.order_id,
      payload: row.payload,
      attempts: row.attempts,
    }));
  }

  async complete(jobId: string): Promise<void> {
    await this.pool.query(
      `UPDATE woor.outbox
          SET processed_at = now(), locked_until = NULL, last_error = NULL
        WHERE id = $1`,
      [jobId],
    );
  }

  async retryLater(jobId: string, error: string, delaySec: number): Promise<void> {
    await this.pool.query(
      `UPDATE woor.outbox
          SET locked_until = NULL,
              last_error = left($2, 500),
              available_at = now() + make_interval(secs => $3)
        WHERE id = $1`,
      [jobId, error, delaySec],
    );
  }
}
