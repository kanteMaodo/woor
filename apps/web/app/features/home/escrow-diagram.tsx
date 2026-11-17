/**
 * Le chemin de l'argent, dessiné en SVG : bloqué chez l'acheteur, puis débloqué par le code
 * vers la vendeuse et le livreur, ou rendu à l'acheteur si rien n'arrive.
 */
export function EscrowDiagram() {
  return (
    <figure className="escrow-diagram">
      <svg
        viewBox="0 0 640 300"
        role="img"
        aria-labelledby="escrow-title escrow-desc"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="escrow-title">Le chemin de l'argent avec Wóor</title>
        <desc id="escrow-desc">
          L'acheteur bloque son paiement. Le code à six chiffres le débloque vers la vendeuse et le
          livreur. Sans remise, le paiement bloqué est annulé et l'argent reste à l'acheteur.
        </desc>
        <defs>
          <marker
            id="arrow-ok"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 10 5 0 10z" fill="#3ddc97" />
          </marker>
          <marker
            id="arrow-back"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 10 5 0 10z" fill="#f7931a" />
          </marker>
        </defs>

        {/* Acheteur */}
        <g transform="translate(20 100)">
          <rect width="150" height="100" rx="18" fill="#1e2d4f" stroke="#33466e" />
          <text x="75" y="44" textAnchor="middle" className="d-title">
            Acheteur
          </text>
          <text x="75" y="68" textAnchor="middle" className="d-sub">
            paie en bitcoin
          </text>
        </g>

        {/* Paiement bloqué */}
        <g transform="translate(245 80)">
          <rect width="150" height="140" rx="22" fill="#0b6e4f" />
          <g
            transform="translate(59 22)"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <rect x="0" y="16" width="32" height="24" rx="4" />
            <path d="M6 16V9a10 10 0 0 1 20 0v7" />
          </g>
          <text x="75" y="92" textAnchor="middle" className="d-title light">
            Bloqué
          </text>
          <text x="75" y="114" textAnchor="middle" className="d-sub light">
            pas encaissé
          </text>
        </g>

        {/* Vendeuse et livreur */}
        <g transform="translate(470 40)">
          <rect width="150" height="80" rx="18" fill="#1e2d4f" stroke="#33466e" />
          <text x="75" y="36" textAnchor="middle" className="d-title">
            Vendeuse
          </text>
          <text x="75" y="58" textAnchor="middle" className="d-sub">
            prix de l'article
          </text>
        </g>
        <g transform="translate(470 180)">
          <rect width="150" height="80" rx="18" fill="#1e2d4f" stroke="#33466e" />
          <text x="75" y="36" textAnchor="middle" className="d-title">
            Livreur
          </text>
          <text x="75" y="58" textAnchor="middle" className="d-sub">
            prix de la course
          </text>
        </g>

        {/* Flèches */}
        <path d="M172 150H240" stroke="#3ddc97" strokeWidth="3" markerEnd="url(#arrow-ok)" />
        <path
          d="M397 125C430 110 440 85 465 82"
          stroke="#3ddc97"
          strokeWidth="3"
          fill="none"
          markerEnd="url(#arrow-ok)"
        />
        <path
          d="M397 175C430 190 440 215 465 218"
          stroke="#3ddc97"
          strokeWidth="3"
          fill="none"
          markerEnd="url(#arrow-ok)"
        />
        <path
          d="M320 225C320 285 95 285 95 205"
          stroke="#f7931a"
          strokeWidth="2.5"
          strokeDasharray="7 7"
          fill="none"
          markerEnd="url(#arrow-back)"
        />

        {/* Légendes */}
        <rect x="402" y="137" width="62" height="26" rx="13" fill="#3ddc97" />
        <text x="433" y="155" textAnchor="middle" className="d-badge">
          code ✓
        </text>
        <text x="208" y="290" textAnchor="middle" className="d-back">
          sans remise : rendu à l'acheteur
        </text>
      </svg>
    </figure>
  );
}
