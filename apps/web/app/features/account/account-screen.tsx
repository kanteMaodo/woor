import type { ReactNode } from "react";
import { Form, Link } from "react-router";

import { Icon } from "../../components/ui/icon";
import { Screen } from "../../components/ui/screen";

interface AccountScreenProps {
  /** Nom de la personne connectée, rappelé en haut à droite. */
  displayName: string;
  /** Lien de retour vers la liste, sur les écrans de détail. */
  backTo?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Gabarit des espaces vendeuse et livreur : le nom, et la déconnexion à portée de main. */
export function AccountScreen({ displayName, backTo, children, footer }: AccountScreenProps) {
  return (
    <Screen
      context={
        <>
          <span>{displayName}</span>
          <Form method="post" action="/deconnexion">
            <button type="submit" className="icon-btn" aria-label="Se déconnecter">
              <Icon name="power" />
            </button>
          </Form>
        </>
      }
      footer={footer}
    >
      {backTo && (
        <Link to={backTo} className="back-link">
          <Icon name="arrow-left" size="sm" /> Retour
        </Link>
      )}
      {children}
    </Screen>
  );
}
