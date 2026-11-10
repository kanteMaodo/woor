const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;

/**
 * Convertit un prix décimal reçu en texte ("62345.678") en centimes entiers (6234568n),
 * arrondi au centime le plus proche. Aucun nombre à virgule flottante n'intervient.
 */
export function parseDecimalToCents(value: string): bigint {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(`Montant décimal invalide : « ${value} »`);
  }
  const units = BigInt(match[1] ?? "0");
  const fraction = (match[2] ?? "").padEnd(3, "0");
  const cents = BigInt(fraction.slice(0, 2));
  const roundUp = Number(fraction[2]) >= 5 ? 1n : 0n;
  return units * 100n + cents + roundUp;
}

/** Affiche des centimes au format décimal attendu par PostgreSQL : 6234568n devient "62345.68". */
export function formatCents(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

/** Division entière arrondie au plus proche, pour des entiers positifs. */
export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

/** Division entière arrondie vers le haut, pour des entiers positifs. */
export function divideCeil(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}
