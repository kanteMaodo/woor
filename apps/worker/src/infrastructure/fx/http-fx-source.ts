import { type FxSample, parseDecimalToCents } from "@woor/core";
import type { z } from "zod";

import type { FxRateSource } from "../../application/ports/fx";

const TIMEOUT_MS = 5_000;

/**
 * Source de cours lue sur une API publique en JSON.
 * Chaque source ne décrit que son adresse, la forme de sa réponse et où lire le prix.
 */
export class HttpFxSource<TSchema extends z.ZodType> implements FxRateSource {
  constructor(
    readonly name: string,
    private readonly url: string,
    private readonly schema: TSchema,
    private readonly readPrice: (body: z.infer<TSchema>) => string,
  ) {}

  async fetchSample(): Promise<FxSample> {
    const response = await fetch(this.url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`${this.name} a répondu ${response.status}`);
    }
    const body = this.schema.parse(await response.json());
    return { source: this.name, eurPerBtcCents: parseDecimalToCents(this.readPrice(body)) };
  }
}
