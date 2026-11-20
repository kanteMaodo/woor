/**
 * Illustrations dessinées à la main, en SVG : formes simples, trait encre, couleurs du site
 * (vert profond, vert citron, kraft, tissu wax). Aucune image générée, rien à télécharger.
 */

const INK = "#102C24";
const GREEN = "#0B6E4F";
const LIME = "#D7F58A";
const KRAFT = "#D9B27C";
const KRAFT_DARK = "#B98D55";
const WAX_ORANGE = "#E9772E";
const WAX_INDIGO = "#2F4B8F";
const CREAM = "#FFFDF8";

const stroke = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Un colis en kraft, noué d'un ruban de tissu wax. */
function Parcel({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 22 L44 4 L92 20 L48 40 Z" fill={KRAFT} {...stroke} />
      <path d="M0 22 L0 72 L48 92 L48 40 Z" fill={KRAFT_DARK} {...stroke} />
      <path d="M48 40 L92 20 L92 70 L48 92 Z" fill={KRAFT} {...stroke} />
      {/* Ruban wax : bandes orange et indigo */}
      <path d="M24 31 L24 82" stroke={WAX_ORANGE} strokeWidth="9" />
      <path d="M24 31 L24 82" stroke={WAX_INDIGO} strokeWidth="3" strokeDasharray="4 6" />
      <path d="M70 30 L70 81" stroke={WAX_ORANGE} strokeWidth="9" />
      <path d="M70 30 L70 81" stroke={WAX_INDIGO} strokeWidth="3" strokeDasharray="4 6" />
      <path d="M22 13 Q44 22 68 12" fill="none" stroke={WAX_ORANGE} strokeWidth="7" />
      <path d="M0 22 L44 4 L92 20 L48 40 Z" fill="none" {...stroke} />
    </g>
  );
}

/** La vendeuse : sa conversation devient une commande, le colis est prêt. */
export function SellerScene({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 220" aria-hidden="true" focusable="false">
      <ellipse cx="170" cy="118" rx="132" ry="92" fill={LIME} opacity="0.35" />
      <path d="M40 196 H290" {...stroke} strokeWidth="2.5" opacity="0.35" />

      {/* Téléphone */}
      <g transform="rotate(-6 120 110)">
        <rect x="70" y="24" width="104" height="176" rx="18" fill={INK} {...stroke} />
        <rect x="80" y="40" width="84" height="146" rx="8" fill={CREAM} />
        <rect x="108" y="30" width="28" height="5" rx="2.5" fill={GREEN} />
        <rect x="88" y="54" width="54" height="22" rx="8" fill="#E6EFE9" />
        <rect x="104" y="84" width="54" height="22" rx="8" fill={LIME} />
        <rect x="88" y="114" width="62" height="34" rx="8" fill={GREEN} />
        <path
          d="M100 131 l8 8 l16 -16"
          fill="none"
          stroke={CREAM}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="88" y="156" width="40" height="8" rx="4" fill="#E6EFE9" />
      </g>

      <Parcel x={186} y={96} scale={1.05} />

      {/* Petite feuille, pour la vie de l'atelier */}
      <path d="M262 64 q20 -22 36 -6 q-14 22 -36 6 Z" fill={GREEN} {...stroke} strokeWidth="2.5" />
      <path d="M262 64 q14 -4 28 -8" fill="none" {...stroke} strokeWidth="2" />
    </svg>
  );
}

/** Le livreur : la course est payée d'avance, le colis est sur la moto. */
export function CourierScene({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 220" aria-hidden="true" focusable="false">
      <ellipse cx="166" cy="116" rx="134" ry="90" fill={LIME} opacity="0.35" />
      <path d="M24 186 H300" {...stroke} strokeWidth="2.5" opacity="0.4" />
      <path d="M44 150 H86 M30 166 H72 M56 134 H92" {...stroke} strokeWidth="2.5" opacity="0.5" />

      {/* Roues, dessinées d'abord : la carrosserie les couvre comme des garde-boue */}
      <circle cx="104" cy="166" r="22" fill={CREAM} {...stroke} />
      <circle cx="104" cy="166" r="7" fill={INK} />
      <circle cx="238" cy="166" r="22" fill={CREAM} {...stroke} />
      <circle cx="238" cy="166" r="7" fill={INK} />

      {/* Scooter */}
      <path
        d="M80 152 C80 126 100 118 124 118 H168 C178 118 182 126 184 136 L188 150 H212 L224 100 H238 L250 146 C252 156 246 160 238 160 H92 C84 160 80 158 80 152 Z"
        fill={GREEN}
        {...stroke}
      />
      <path d="M224 100 L220 84 H236" fill="none" {...stroke} strokeWidth="4" />
      <circle cx="243" cy="112" r="6" fill={LIME} {...stroke} strokeWidth="2.5" />
      <rect x="124" y="104" width="54" height="14" rx="7" fill={INK} {...stroke} />

      {/* Porte-bagages et colis */}
      <path d="M70 106 H124 M86 106 V122" {...stroke} />
      <Parcel x={68} y={44} scale={0.66} />
    </svg>
  );
}

/** Rien pour l'instant : un carton ouvert, qui attend sa prochaine commande. */
export function EmptyParcelScene({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 140" aria-hidden="true" focusable="false">
      <ellipse cx="100" cy="122" rx="70" ry="10" fill={INK} opacity="0.08" />
      <path d="M50 60 L100 76 L150 60 L150 112 L100 128 L50 112 Z" fill={KRAFT} {...stroke} />
      <path d="M100 76 V128" {...stroke} />
      <path d="M50 60 L30 40 L80 26 L100 44" fill={KRAFT_DARK} {...stroke} />
      <path d="M150 60 L170 40 L120 26 L100 44" fill={KRAFT_DARK} {...stroke} />
      <path d="M50 60 L100 44 L150 60 L100 76 Z" fill="#8C6A3E" {...stroke} />
      <path d="M86 96 q14 10 28 0" fill="none" {...stroke} />
      <circle cx="84" cy="88" r="3" fill={INK} />
      <circle cx="116" cy="88" r="3" fill={INK} />
      <path d="M156 34 l6 -10 M168 44 l10 -4 M146 24 l2 -10" {...stroke} stroke={GREEN} />
    </svg>
  );
}
