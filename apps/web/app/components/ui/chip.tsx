import { Icon, type IconName } from "./icon";

export type ChipTone = "locked" | "route" | "wait" | "done" | "danger";

export interface ChipProps {
  tone: ChipTone;
  icon: IconName;
  label: string;
}

/** Pastille d'état : une icône et un mot, jamais la couleur seule. */
export function Chip({ tone, icon, label }: ChipProps) {
  return (
    <span className={`chip ${tone}`}>
      <Icon name={icon} size="sm" />
      {label}
    </span>
  );
}
