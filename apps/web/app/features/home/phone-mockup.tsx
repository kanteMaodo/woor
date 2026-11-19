import type { ReactNode } from "react";

import { Logo } from "../../components/ui/logo";

interface PhoneMockupProps {
  /** Texte de la barre du haut, comme dans l'application : « En route », « Paiement 2 sur 2 ». */
  context: string;
  children: ReactNode;
  className?: string;
}

/**
 * Un téléphone dessiné en CSS, avec un vrai écran de Wóor dedans.
 * Aucune image à télécharger : la page reste légère sur la 3G.
 */
export function PhoneMockup({ context, children, className = "" }: PhoneMockupProps) {
  return (
    <div className={`phone-mockup ${className}`} aria-hidden="true">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="appbar">
          <span className="brand">
            <Logo />
          </span>
          <span className="ctx">{context}</span>
        </div>
        <div className="phone-content">{children}</div>
      </div>
    </div>
  );
}
