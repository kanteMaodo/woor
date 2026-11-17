/**
 * Données des écrans de compte qui n'ont pas encore leur route d'API
 * (versements, sécurité du compte, livreurs invités). Les écrans en dépendent seuls :
 * l'API devra renvoyer ces formes, validées par Zod comme les autres.
 */

export type PayoutStatus = "received" | "upcoming" | "failed";

export interface PayoutView {
  id: string;
  label: string;
  amountXof: number;
  status: PayoutStatus;
  /** Quand le versement est arrivé, ou ce qu'il attend. */
  when: string;
}

export interface PayoutAddressView {
  current: string | null;
  /** Dernier test réussi de l'adresse (1 sat envoyé). */
  testedAt: string | null;
  pendingChange: { address: string; requestedAt: string; effectiveAt: string } | null;
}

export interface SessionView {
  id: string;
  label: string;
  current: boolean;
  expiresAt: string | null;
}

export interface SecurityView {
  phoneLast2: string | null;
  hasPasskey: boolean;
  passkeyAddedAt: string | null;
  hasPin: boolean;
  sessions: SessionView[];
  notifications: boolean;
}

export type CourierLinkStatus = "active" | "to_verify" | "invited";

export interface CourierLinkView {
  id: string;
  displayName: string;
  phoneLast2: string;
  status: CourierLinkStatus;
  detail: string;
}
