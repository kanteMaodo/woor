import type { OrderState } from "@woor/core";

import { Icon, type IconName } from "../../../components/ui/icon";

const STEPS: readonly { label: string; icon: IconName }[] = [
  { label: "Commandé", icon: "check" },
  { label: "Bloqué", icon: "lock" },
  { label: "En route", icon: "moto" },
  { label: "Remis", icon: "box" },
  { label: "Payé", icon: "coin" },
];

/** Étape en cours pour chaque état ; au-delà de la dernière, tout est fait. */
const CURRENT_STEP: Partial<Record<OrderState, number>> = {
  awaiting_payment: 0,
  locked: 1,
  in_transit: 2,
  disputed: 2,
  delivered: 4,
  paid_out: 5,
};

/** Frise en cinq étapes, toujours visible : chaque étape a une icône et un mot. */
export function OrderProgress({ state }: { state: OrderState }) {
  const current = CURRENT_STEP[state] ?? 0;

  return (
    <ol className="frise" aria-label="Avancement de la commande">
      {STEPS.map((step, index) => {
        const status = index < current ? "done" : index === current ? "now" : "";
        return (
          <li
            key={step.label}
            className={status}
            aria-current={status === "now" ? "step" : undefined}
          >
            <span className="dot">
              <Icon name={status === "done" ? "check" : step.icon} size="sm" />
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
