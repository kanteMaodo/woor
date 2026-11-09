import pg from "pg";

export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;

export interface PoolOptions {
  connectionString: string;
  /** Visible dans pg_stat_activity : permet de savoir quel service tient une connexion. */
  applicationName: string;
  max?: number;
}

export function createPool({ connectionString, applicationName, max = 10 }: PoolOptions): Pool {
  return new pg.Pool({
    connectionString,
    application_name: applicationName,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}
