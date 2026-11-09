import type { AppRole } from "@woor/core";

import type { Pool, PoolClient } from "./pool";

/**
 * Identité de la requête, lue par woor.ctx_user(), woor.ctx_role() et woor.ctx_buyer_order().
 * La RLS et les fonctions SECURITY DEFINER s'appuient dessus.
 */
export interface RequestContext {
  role: AppRole;
  userId?: string;
  buyerOrderId?: string;
}

/** Exécute fn dans une transaction : COMMIT si tout passe, ROLLBACK sinon. */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Transaction avec le contexte de la requête posé en premier.
 * Le troisième argument "true" de set_config limite la valeur à cette transaction :
 * elle ne fuit jamais vers la requête suivante qui réutilise la connexion.
 */
export function withContext<T>(
  pool: Pool,
  context: RequestContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTransaction(pool, async (client) => {
    await client.query(
      `SELECT set_config('woor.role', $1, true),
              set_config('woor.user_id', $2, true),
              set_config('woor.buyer_order_id', $3, true)`,
      [context.role, context.userId ?? "", context.buyerOrderId ?? ""],
    );
    return fn(client);
  });
}
