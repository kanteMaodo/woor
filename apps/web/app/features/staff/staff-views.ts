/**
 * Données des écrans de l'équipe Wóor (arbitre, administrateur).
 * Les montants et compteurs viennent des vues du schéma : v_locked_totals, v_alerts,
 * v_courier_record, v_user_strikes, settings.
 */

export interface NodeHealth {
  lockedXof: number;
  lockedCapXof: number;
  heldPayments: number;
  maxPayments: number;
  htlcMarginBlocks: number;
  nodeOnline: boolean;
  reconciliation: string;
}

export interface AlertView {
  id: string;
  kind: "dispute" | "payout";
  title: string;
  detail: string;
}

export interface DisputeEvent {
  at: string;
  label: string;
}

export interface DisputeView {
  id: string;
  reasonLabel: string;
  decideBefore: string;
  itemLabel: string;
  events: DisputeEvent[];
  contacts: { label: string }[];
}

export interface KillSwitchView {
  engagedAt: string;
  engagedBy: string;
  reason: string;
  releaseRequestedBy: string | null;
  releaseRequestedAt: string | null;
  /** La personne connectée a fait la demande : elle ne peut pas la valider elle-même. */
  requestedByMe: boolean;
}

export interface AccountRecordView {
  displayName: string;
  roleLabel: string;
  phoneLast2: string;
  verified: boolean;
  metrics: { label: string; value: string }[];
  lastStrike: string | null;
}

export type AccountStatus = "active" | "to_verify" | "staff";

export interface AccountListItem {
  id: string;
  displayName: string;
  detail: string;
  status: AccountStatus;
}

export interface SettingView {
  key: string;
  label: string;
  range: string;
  value: string;
}
