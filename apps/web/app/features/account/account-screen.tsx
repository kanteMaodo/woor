import type { ReactNode } from "react";
import { Form, Link, NavLink } from "react-router";

import { Icon, type IconName } from "../../components/ui/icon";
import type { Profile } from "../../lib/api/account-schemas";
import { Logo } from "../../components/ui/logo";

interface AccountScreenProps {
  profile: Profile;
  /** Titre de la page, en haut du contenu. */
  title: ReactNode;
  /** Bandeau d’accueil : remplace l’en-tête de page sur les tableaux de bord. */
  banner?: ReactNode;
  subtitle?: ReactNode;
  /** Boutons d’action, à droite du titre sur ordinateur, sous le titre sur téléphone. */
  actions?: ReactNode;
  /** Lien de retour, sur les écrans de détail. */
  backTo?: string;
  children: ReactNode;
}

interface MenuItem {
  to: string;
  label: string;
  /** Libellé court, pour la barre d’onglets du téléphone. */
  short: string;
  icon: IconName;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

/** Menu de chaque rôle, en sections comme un logiciel de gestion. */
const MENU: Record<Profile["role"], MenuSection[]> = {
  seller: [
    {
      label: "Ventes",
      items: [
        { to: "/vendeuse", label: "Tableau de bord", short: "Accueil", icon: "box" },
        { to: "/vendeuse/nouvelle", label: "Nouvelle commande", short: "Vendre", icon: "plus" },
      ],
    },
    {
      label: "Mon activité",
      items: [
        { to: "/vendeuse/livreurs", label: "Mes livreurs", short: "Livreurs", icon: "users" },
        { to: "/vendeuse/versements", label: "Versements", short: "Argent", icon: "wallet" },
        { to: "/vendeuse/compte", label: "Mon compte", short: "Compte", icon: "user" },
      ],
    },
  ],
  courier: [
    {
      label: "Livraisons",
      items: [{ to: "/livreur", label: "Mes courses", short: "Courses", icon: "moto" }],
    },
    {
      label: "Mon activité",
      items: [
        { to: "/livreur/versements", label: "Mes versements", short: "Argent", icon: "wallet" },
        { to: "/livreur/compte", label: "Mon compte", short: "Compte", icon: "user" },
      ],
    },
  ],
  arbiter: [
    {
      label: "Arbitrage",
      items: [
        { to: "/arbitre", label: "Tableau de bord", short: "Accueil", icon: "scale" },
        { to: "/arbitre/interrupteur", label: "Interrupteur", short: "Arrêt", icon: "power" },
      ],
    },
  ],
  admin: [
    {
      label: "Administration",
      items: [
        { to: "/admin", label: "Comptes", short: "Comptes", icon: "users" },
        { to: "/admin/reglages", label: "Réglages du pilote", short: "Réglages", icon: "sliders" },
      ],
    },
  ],
};

const ROLE_LABEL: Record<Profile["role"], string> = {
  seller: "Vendeuse",
  courier: "Livreur",
  arbiter: "Arbitre",
  admin: "Administrateur",
};

/**
 * Gabarit des espaces vendeuse et livreur.
 * Ordinateur : barre latérale sombre, titre de page et actions en haut du contenu.
 * Téléphone : barre du haut, et barre d’onglets en bas quand il y a plusieurs pages.
 */
export function AccountScreen({
  profile,
  title,
  subtitle,
  actions,
  backTo,
  banner,
  children,
}: AccountScreenProps) {
  const sections = MENU[profile.role];
  const items = sections.flatMap((section) => section.items);
  const initial = profile.displayName.charAt(0).toUpperCase();

  return (
    <div className={`dash${items.length > 1 ? " has-tabs" : ""}`}>
      <aside className="dash-side" aria-label="Navigation">
        <Link to={items[0]?.to ?? "/"} className="brand dash-brand">
          <Logo />
        </Link>
        <nav className="dash-nav">
          {sections.map((section) => (
            <div key={section.label} className="dash-group">
              <p className="dash-section">{section.label}</p>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end>
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="dash-account">
          <span className="dash-avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="dash-who">
            <b>{profile.displayName}</b>
            <span>{ROLE_LABEL[profile.role]}</span>
          </span>
          <LogoutButton />
        </div>
      </aside>

      <header className="dash-top">
        <Link to={items[0]?.to ?? "/"} className="brand">
          <Logo />
        </Link>
        <div className="dash-top-user">
          <span className="dash-avatar small" aria-hidden="true">
            {initial}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-page">
          {backTo && (
            <Link to={backTo} className="back-link">
              <Icon name="arrow-left" size="sm" /> Retour
            </Link>
          )}
          {banner ?? (
            <div className="dash-head">
              <div>
                <h1>{title}</h1>
                {subtitle && <p className="dash-subtitle">{subtitle}</p>}
              </div>
              {actions && <div className="dash-actions">{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>

      {items.length > 1 && (
        <nav className="dash-tabs" aria-label="Onglets">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end>
              <Icon name={item.icon} />
              <span>{item.short}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

function LogoutButton() {
  return (
    <Form method="post" action="/deconnexion" className="dash-logout">
      <button type="submit" className="icon-btn" aria-label="Se déconnecter" title="Se déconnecter">
        <Icon name="power" />
      </button>
    </Form>
  );
}
