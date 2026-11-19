import type { ReactNode } from "react";

interface ScreenProps {
  /** Texte court à droite de la marque : « Paiement 1 sur 2 », « En route ». */
  context?: ReactNode;
  children: ReactNode;
  /** Action principale, en bas, à portée de pouce. */
  footer?: ReactNode;
}

/** Gabarit commun à tous les écrans : une barre, un contenu, une action en bas. */
export function Screen({ context, children, footer }: ScreenProps) {
  return (
    <div className="screen">
      <header className="appbar">
        <span className="brand">Wóor</span>
        {context && <span className="ctx">{context}</span>}
      </header>
      <main className="content">{children}</main>
      {footer && <footer className="bottom">{footer}</footer>}
    </div>
  );
}
