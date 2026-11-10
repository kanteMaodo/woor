import { type FxQuote, formatCents } from "@woor/core";
import type { Pool } from "@woor/db";

import type { FxQuoteRepository } from "../../application/ports/fx";

export class PgFxQuoteRepository implements FxQuoteRepository {
  constructor(private readonly pool: Pool) {}

  async save(quote: FxQuote): Promise<string> {
    const sources = quote.samples.map((sample) => ({
      source: sample.source,
      eur_per_btc: formatCents(sample.eurPerBtcCents),
    }));

    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO woor.fx_quotes (eur_per_btc, sources, spread_pct)
       VALUES ($1::numeric, $2::jsonb, $3)
       RETURNING id`,
      [formatCents(quote.eurPerBtcCents), JSON.stringify(sources), quote.spreadPct],
    );
    const id = rows[0]?.id;
    if (!id) {
      throw new Error("Insertion du cours sans identifiant");
    }
    return id;
  }
}
