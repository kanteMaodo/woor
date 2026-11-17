import type { ReactNode } from "react";

/** Icônes du design system, reprises de la maquette. Traits de 2 px sur une grille de 24. */
const PATHS = {
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  moto: (
    <>
      <circle cx="5.5" cy="16.5" r="3" />
      <circle cx="18.5" cy="16.5" r="3" />
      <path d="M5.5 16.5 9 10h5l4.5 6.5M14 10l-1.5-4H10M15 6h3l1.5 3" />
    </>
  ),
  box: (
    <>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="m3 7.5 9 4.5 9-4.5M12 12v9" />
    </>
  ),
  coin: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.4-1" />
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M14 9l2 2" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h11v4" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M16 13.5h2" />
    </>
  ),
  external: (
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  ),
  dots: (
    <>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  chev: <path d="m9 6 6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M12 19l-7-7 7-7" />,
  power: <path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: "sm" | "md" | "lg" | "xl";
}

/** Icône décorative : le texte voisin porte toujours le sens, jamais la couleur seule. */
export function Icon({ name, size = "md" }: IconProps) {
  return (
    <svg className={`i i-${size}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
