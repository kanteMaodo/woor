import type { ReactNode } from "react";

interface PersonRowProps {
  name: string;
  detail: ReactNode;
  /** Pastille d'état ou bouton, à droite. */
  aside?: ReactNode;
}

/** Une personne dans une liste : initiale, nom, détail, état. */
export function PersonRow({ name, detail, aside }: PersonRowProps) {
  return (
    <div className="person-row">
      <span className="initial" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="person-text">
        <b>{name}</b>
        <span>{detail}</span>
      </span>
      {aside && <span className="person-aside">{aside}</span>}
    </div>
  );
}
