import { divideCeil, divideRounded } from "./decimal";

/** Parité fixe du franc CFA : 1 EUR = 655,957 F, exprimée en millièmes. */
const XOF_PER_EUR_THOUSANDTHS = 655_957n;

/** Nombre minimal de sources de cours exigé par la table woor.fx_quotes. */
export const MIN_FX_SOURCES = 3;

/** Écart maximal toléré entre la source la plus haute et la plus basse, en pourcentage de la médiane. */
export const MAX_FX_SPREAD_PCT = 2;

const SATS_PER_BTC = 100_000_000n;
const MSAT_PER_SAT = 1_000n;

export interface FxSample {
  source: string;
  eurPerBtcCents: bigint;
}

export interface FxQuote {
  samples: readonly FxSample[];
  /** Médiane des sources, en centimes d'euro. */
  eurPerBtcCents: bigint;
  /** Même calcul que la colonne générée woor.fx_quotes.xof_per_btc : arrondi au centime. */
  xofPerBtcCents: bigint;
  /** Écart entre les sources, avec deux décimales, comme la colonne spread_pct. */
  spreadPct: number;
}

export class FxQuoteError extends Error {
  override readonly name = "FxQuoteError";
}

/**
 * Construit un cours à partir de plusieurs sources : médiane, puis contrôle de l'écart.
 * Refuse le cours si les sources sont trop peu nombreuses ou trop éloignées.
 */
export function buildFxQuote(samples: readonly FxSample[]): FxQuote {
  if (samples.length < MIN_FX_SOURCES) {
    throw new FxQuoteError(
      `${samples.length} source(s) de cours disponible(s), ${MIN_FX_SOURCES} exigées`,
    );
  }

  const prices = samples.map((s) => s.eurPerBtcCents).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const median = medianOfSorted(prices);
  const lowest = prices[0] ?? median;
  const highest = prices[prices.length - 1] ?? median;
  const spreadPct = Number(divideRounded((highest - lowest) * 10_000n, median)) / 100;

  if (spreadPct > MAX_FX_SPREAD_PCT) {
    throw new FxQuoteError(
      `Les sources de cours s'écartent de ${spreadPct} %, plus que ${MAX_FX_SPREAD_PCT} %`,
    );
  }

  return {
    samples,
    eurPerBtcCents: median,
    xofPerBtcCents: divideRounded(median * XOF_PER_EUR_THOUSANDTHS, 1_000n),
    spreadPct,
  };
}

/**
 * Montant à facturer en millisatoshis pour un prix en FCFA.
 * Arrondi au satoshi supérieur : certains wallets refusent les fractions de satoshi,
 * et l'arrondi vers le haut garantit que la somme encaissée couvre le prix.
 */
export function xofToMsat(amountXof: number, xofPerBtcCents: bigint): bigint {
  if (!Number.isSafeInteger(amountXof) || amountXof <= 0) {
    throw new RangeError(`Montant en FCFA invalide : ${amountXof}`);
  }
  const sats = divideCeil(BigInt(amountXof) * 100n * SATS_PER_BTC, xofPerBtcCents);
  return sats * MSAT_PER_SAT;
}

function medianOfSorted(values: readonly bigint[]): bigint {
  const middle = Math.floor(values.length / 2);
  const upper = values[middle];
  if (upper === undefined) {
    throw new FxQuoteError("Aucun cours à départager");
  }
  if (values.length % 2 === 1) {
    return upper;
  }
  const lower = values[middle - 1] ?? upper;
  return divideRounded(lower + upper, 2n);
}
