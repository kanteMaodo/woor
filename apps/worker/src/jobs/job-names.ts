/**
 * Le service de paiements n'a pas de route HTTP : il lit des tâches dans une file.
 * Chaque nom ci-dessous aura son gestionnaire dans ce dossier.
 */
export const JOB_NAMES = [
  "invoice.watch",
  "invoice.settle",
  "invoice.cancel",
  "payout.run",
  "timer.fire",
] as const;

export type JobName = (typeof JOB_NAMES)[number];
