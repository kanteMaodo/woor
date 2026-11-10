import type { FxQuote, FxSample } from "@woor/core";

/** Une source publique du cours BTC/EUR. */
export interface FxRateSource {
  readonly name: string;
  fetchSample(): Promise<FxSample>;
}

export interface FxQuoteRepository {
  /** Enregistre le cours utilisé et renvoie son identifiant, lié ensuite à chaque facture. */
  save(quote: FxQuote): Promise<string>;
}
