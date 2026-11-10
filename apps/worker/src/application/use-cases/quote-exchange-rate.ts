import { buildFxQuote, type FxQuote } from "@woor/core";

import type { FxQuoteRepository, FxRateSource } from "../ports/fx";
import type { Logger } from "../ports/logger";

export interface RecordedQuote {
  id: string;
  quote: FxQuote;
}

/**
 * Interroge toutes les sources en parallèle, retient la médiane et l'enregistre.
 * Le cours est refusé si moins de trois sources répondent ou si elles divergent.
 */
export class QuoteExchangeRate {
  constructor(
    private readonly sources: readonly FxRateSource[],
    private readonly quotes: FxQuoteRepository,
    private readonly logger: Logger,
  ) {}

  async execute(): Promise<RecordedQuote> {
    const results = await Promise.allSettled(this.sources.map((source) => source.fetchSample()));

    const samples = results.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return [result.value];
      }
      this.logger.warn(
        { source: this.sources[index]?.name, err: result.reason },
        "Source de cours indisponible",
      );
      return [];
    });

    const quote = buildFxQuote(samples);
    const id = await this.quotes.save(quote);
    return { id, quote };
  }
}
