import type { ReactNode } from "react";
import { Form, Link, NavLink } from "react-router";

import { Icon, type IconName } from "../../components/ui/icon";
import type { Profile } from "../../lib/api/account-schemas";

interface AccountScreenProps {
  profile: Profile;
  /** Lien de retour vers la liste, sur les écrans de détail. */
  backTo?: string;
  children: ReactNode;
  /** Action principale : en bas sur téléphone, dans un panneau à droite sur ordinateur. */
  footer?: ReactNode;
}

const MENU: Partial<Record<Profile["role"], { to: string; label: string; icon: IconName }[]>> = {
  seller: [
    { to: "/vendeuse", label: "Mes commandes", icon: "box" },
    { to: "/vendeuse/nouvelle", label: "Nouvelle commande", icon: "plus" },
  ],
  courier: [{ to: "/livreur", label: "Mes courses", icon: "moto" }],
};

/**
 * Gabarit des espaces vendeuse et livreur.
 * Téléphone : une colonne, l'action en bas à portée de pouce.
 * Ordinateur : barre de navigation, contenu large, action dans un panneau latéral.
 */
export function AccountScreen({ profile, backTo, children, footer }: AccountScreenProps) {
  const menu = MENU[profile.role] ?? [];

  return (
    <div className="app">
      <header className="app-bar">
        <div className="app-bar-inner">
          <Link to={menu[0]?.to ?? "/"} className="brand app-brand">
            <Icon name="bolt" />
            Wóor
          </Link>
          <nav className="app-menu" aria-label="Menu">
            {menu.map((item) => (
              <NavLink key={item.to} to={item.to} end>
                <Icon name={item.icon} size="sm" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="app-user">
            <span className="app-avatar" aria-hidden="true">
              {profile.displayName.charAt(0)}
            </span>
            <span className="app-user-name">{profile.displayName}</span>
            <Form method="post" action="/deconnexion">
              <button type="submit" className="icon-btn" aria-label="Se déconnecter">
                <Icon name="power" />
              </button>
            </Form>
          </div>
        </div>
      </header>

      <div className={`app-body${footer ? " has-actions" : ""}`}>
        <main className="app-content">
          {backTo && (
            <Link to={backTo} className="back-link">
              <Icon name="arrow-left" size="sm" /> Retour
            </Link>
          )}
          {children}
        </main>
        {footer && <aside className="app-actions">{footer}</aside>}
      </div>
    </div>
  );
}
