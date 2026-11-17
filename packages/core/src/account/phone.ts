/** Indicatif du Sénégal : les comptes du pilote sont tous à Dakar. */
const SENEGAL_PREFIX = "+221";

/** Mobiles sénégalais : 9 chiffres commençant par 7 (Orange, Free, Expresso…). */
const SENEGAL_MOBILE = /^7\d{8}$/;

/**
 * Met un numéro saisi au format E.164 : « 77 000 00 01 », « +221 77 000 00 01 » et
 * « 00221770000001 » donnent tous « +221770000001 ». null si ce n'est pas un mobile sénégalais.
 */
export function toSenegalE164(input: string): string | null {
  let digits = input.replace(/[\s.-]/g, "");
  if (digits.startsWith("+221")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("00221")) {
    digits = digits.slice(5);
  }
  return SENEGAL_MOBILE.test(digits) ? `${SENEGAL_PREFIX}${digits}` : null;
}

/** PIN de secours : exactement 6 chiffres. */
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
