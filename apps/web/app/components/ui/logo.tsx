interface LogoProps {
  /** Sans le mot : seulement le symbole (barre d'onglets, petite place). */
  markOnly?: boolean;
}

/**
 * Logo de Wóor : un cadenas qui garde un éclair, sur un carré vert.
 * Le paiement Lightning est bloqué, pas encaissé. L'accent du « ó » est orange bitcoin.
 * Le mot prend la couleur du texte autour : encre sur fond clair, blanc sur fond sombre.
 */
export function Logo({ markOnly = false }: LogoProps) {
  return (
    <span className="logo" role="img" aria-label="Wóor">
      <LogoMark />
      {!markOnly && (
        <span className="logo-word" aria-hidden="true">
          W<span className="logo-acute">o</span>or
        </span>
      )}
    </span>
  );
}

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="13" fill="#0B6E4F" />
      <path
        d="M16.5 22v-5a7.5 7.5 0 0 1 15 0v5"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="11" y="21" width="26" height="19" rx="5" fill="#fff" />
      <path d="M25.6 24 19 32.2h4.6l-1.2 5.8 6.6-8.4h-4.6z" fill="#F7931A" />
    </svg>
  );
}
