import { z } from "zod";

import type { FxRateSource } from "../../application/ports/fx";
import { HttpFxSource } from "./http-fx-source";

const price = z.string().regex(/^\d+(\.\d+)?$/);

/** Trois places publiques, sans clé d'API : la médiane écarte une source qui dérive. */
export function createFxSources(): FxRateSource[] {
  return [
    new HttpFxSource(
      "kraken",
      "https://api.kraken.com/0/public/Ticker?pair=XBTEUR",
      z.object({ result: z.record(z.string(), z.object({ c: z.tuple([price, z.string()]) })) }),
      (body) => {
        const ticker = Object.values(body.result)[0];
        if (!ticker) {
          throw new Error("Kraken n'a renvoyé aucun cours");
        }
        return ticker.c[0];
      },
    ),
    new HttpFxSource(
      "coinbase",
      "https://api.coinbase.com/v2/prices/BTC-EUR/spot",
      z.object({ data: z.object({ amount: price }) }),
      (body) => body.data.amount,
    ),
    new HttpFxSource(
      "bitstamp",
      "https://www.bitstamp.net/api/v2/ticker/btceur/",
      z.object({ last: price }),
      (body) => body.last,
    ),
  ];
}
