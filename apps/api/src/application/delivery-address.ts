import type { PiiCipher, SealedText } from "./ports/pii-cipher";

/** Adresse de livraison à Dakar : un quartier et un repère, pas de rue numérotée. */
export interface DeliveryAddress {
  neighborhood: string;
  landmark: string;
}

/** Le quartier et le repère sont chiffrés ensemble, en un seul bloc. */
export function sealAddress(cipher: PiiCipher, address: DeliveryAddress): SealedText {
  return cipher.seal(JSON.stringify(address));
}

/** null quand l'adresse a été effacée, 30 jours après la clôture. */
export function openAddress(cipher: PiiCipher, sealed: SealedText | null): DeliveryAddress | null {
  if (!sealed) {
    return null;
  }
  const parsed = JSON.parse(cipher.open(sealed)) as Partial<DeliveryAddress>;
  return { neighborhood: parsed.neighborhood ?? "", landmark: parsed.landmark ?? "" };
}
