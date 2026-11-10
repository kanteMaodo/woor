import type { Pool } from "@woor/db";

import type { SettingsReader, WorkerSettingKey } from "../../application/ports/settings";

export class PgSettingsReader implements SettingsReader {
  constructor(private readonly pool: Pool) {}

  async getInt(key: WorkerSettingKey): Promise<number> {
    // bigint SQL : pg le renvoie en texte pour ne rien perdre en précision.
    const { rows } = await this.pool.query<{ value: string }>(
      `SELECT woor.setting_int($1) AS value`,
      [key],
    );
    const value = Number(rows[0]?.value);
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Réglage « ${key} » illisible`);
    }
    return value;
  }
}
