const DAKAR = "Africa/Dakar";
/** Espace insécable : le montant et son unité ne sont jamais séparés en fin de ligne. */
const NBSP = "\u00a0";

const xofFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DAKAR,
});

/** Montant en FCFA : chiffres groupés par trois, puis une espace insécable et « F ». */
export function formatXof(amount: number): string {
  return `${xofFormat.format(amount)}${NBSP}F`;
}

/** Montant en satoshis, groupé comme les FCFA. */
export function formatSats(amount: number): string {
  return `${xofFormat.format(amount)}${NBSP}sats`;
}

/** Heure de Dakar, « 14:32 ». */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Minutes restantes avant une échéance, arrondies vers le haut, jamais négatives. */
export function minutesUntil(iso: string, nowIso: string): number {
  const remainingMs = new Date(iso).getTime() - new Date(nowIso).getTime();
  return Math.max(0, Math.ceil(remainingMs / 60_000));
}

/** Code de remise en deux groupes de trois chiffres : « 482 913 ». */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
