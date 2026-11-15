import type { ReactNode } from "react";

import { Icon, type IconName } from "./icon";

type Tone = "info" | "warn" | "danger";

const ICONS: Record<Tone, IconName> = { info: "lock", warn: "clock", danger: "alert" };

interface BannerProps {
  tone: Tone;
  icon?: IconName;
  children: ReactNode;
}

/** Bandeau d'information : une icône et une phrase courte, jamais la couleur seule. */
export function Banner({ tone, icon, children }: BannerProps) {
  return (
    <div className={`banner ${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={icon ?? ICONS[tone]} />
      <div>{children}</div>
    </div>
  );
}
