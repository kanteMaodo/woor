/** Actions que l’acheteur peut envoyer depuis la page de sa commande. */
export const BUYER_INTENTS = [
  "claim",
  "invoices",
  "code",
  "cancel",
  "confirm-refusal",
  "contest",
  "report",
] as const;

export type BuyerIntent = (typeof BUYER_INTENTS)[number];

export function isBuyerIntent(value: unknown): value is BuyerIntent {
  return typeof value === "string" && (BUYER_INTENTS as readonly string[]).includes(value);
}
