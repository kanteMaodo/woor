import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useRouteLoaderData } from "react-router";

import type { loader as rootLoader } from "../../root";

import { Icon } from "../../components/ui/icon";
import { CONTACT, IMAGES, SOLUTIONS } from "./marketing-content";
import { Logo } from "../../components/ui/logo";

export function WoorBrand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`m-brand${light ? " is-light" : ""}`} aria-label="Wóor, accueil">
      <Logo />
    </Link>
  );
}

const NAV_GROUPS = [
  {
    label: "La plateforme",
    items: [
      {
        to: "/fonctionnement",
        label: "Comment fonctionne Wóor",
      },
      {
        to: "/securite",
        label: "Paiements & protection",
      },
    ],
  },
  {
    label: "Solutions",
    items: SOLUTIONS.map((item) => ({
      to: `/solutions/${item.slug}`,
      label: item.title,
    })),
  },
  {
    label: "Ressources",
    items: [
      {
        to: "/aide",
        label: "Centre d’aide",
      },
      {
        to: "/a-propos",
        label: "À propos de Wóor",
      },
      {
        to: "/contact",
        label: "Nous contacter",
      },
    ],
  },
];

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing">
      <a className="m-skip" href="#contenu">
        Aller au contenu
      </a>
      <MarketingNav />
      <main id="contenu">{children}</main>
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  const accountHome = useRouteLoaderData<typeof rootLoader>("root")?.accountHome;
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) {
        setOpen(null);
        setMobileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const index = NAV_GROUPS.findIndex((group) => group.label === open);
      setOpen(null);
      setMobileOpen(false);
      if (index >= 0) menuButtons.current[index]?.focus();
      else if (mobileOpen) mobileButton.current?.focus();
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, mobileOpen]);

  const close = () => {
    setOpen(null);
    setMobileOpen(false);
  };
  return (
    <header className="m-header" ref={header}>
      <div className="m-nav m-container">
        <WoorBrand />
        <nav className="m-desktop-nav" aria-label="Navigation principale">
          {NAV_GROUPS.map((group, index) => (
            <div key={group.label} className="m-nav-group">
              <button
                ref={(node) => {
                  menuButtons.current[index] = node;
                }}
                type="button"
                aria-expanded={open === group.label}
                aria-controls={`nav-panel-${index}`}
                onClick={() => setOpen(open === group.label ? null : group.label)}
              >
                {group.label}
                <span className="m-chevron" aria-hidden="true" />
              </button>
              <div id={`nav-panel-${index}`} className="m-dropdown" hidden={open !== group.label}>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={close}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          <NavLink to="/contact" onClick={close}>
            Contact
          </NavLink>
        </nav>
        <div className="m-nav-actions">
          <Link className="m-button m-button-small" to={accountHome ?? "/connexion"}>
            {accountHome ? "Mon espace" : "Se connecter"}
          </Link>
          <button
            ref={mobileButton}
            className="m-mobile-toggle"
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileOpen ? <Icon name="x" /> : <span className="m-hamburger" />}
          </button>
        </div>
      </div>
      <nav
        className="m-mobile-nav"
        id="mobile-navigation"
        hidden={!mobileOpen}
        aria-label="Navigation mobile"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => (
              <NavLink to={item.to} key={item.to} onClick={close}>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
        <Link className="m-button" to={accountHome ?? "/connexion"} onClick={close}>
          {accountHome ? "Mon espace" : "Se connecter"}
        </Link>
      </nav>
    </header>
  );
}

interface HeroProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image?: string;
  tag?: string;
  home?: boolean;
  action?: { to: string; label: string };
  secondaryAction?: { to: string; label: string };
}

export function MarketingHero({
  eyebrow,
  title,
  description,
  image = IMAGES.commerce,
  tag,
  home = false,
  action,
  secondaryAction,
}: HeroProps) {
  const accountHome = useRouteLoaderData<typeof rootLoader>("root")?.accountHome;
  const primaryAction = action ?? {
    to: accountHome ?? "/connexion",
    label: accountHome ? "Mon espace" : "Se connecter",
  };
  return (
    <section className={`m-hero${home ? " m-hero-home" : ""}`}>
      <img className="m-hero-image" src={image} alt="" fetchPriority="high" />
      <div className="m-hero-shade" />
      <div className="m-container m-hero-inner">
        <div className="m-hero-copy">
          <p className="m-eyebrow light">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="m-hero-description">{description}</p>
          <div className="m-actions">
            <Link to={primaryAction.to} className="m-button m-button-lime">
              {primaryAction.label}
            </Link>
            <Link
              to={secondaryAction?.to ?? (home ? "/fonctionnement" : "/contact")}
              className="m-button m-button-outline"
            >
              {secondaryAction?.label ?? (home ? "Comment ça marche" : "Contacter l’équipe")}
            </Link>
          </div>
          <p className="m-hero-tag">
            <Icon name="shield" size="sm" />
            {tag ?? "Pensé pour vos échanges. Protégé jusqu’à la remise."}
          </p>
        </div>
        {home && (
          <div className="m-hero-receipt">
            <div className="m-receipt-icon">
              <Icon name="lock" />
            </div>
            <div>
              <span>Paiement protégé</span>
              <strong>Un code de remise à 6 chiffres.</strong>
              <small>Le colis est remis. Le paiement est libéré.</small>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="m-section-heading">
      <div>
        <p className="m-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children && <div className="m-section-intro">{children}</div>}
    </div>
  );
}

function MarketingFooter() {
  const accountHome = useRouteLoaderData<typeof rootLoader>("root")?.accountHome;
  const groups: { title: string; links: [string, string][] }[] = [
    {
      title: "La plateforme",
      links: [
        ["Comment ça marche", "/fonctionnement"],
        ["Paiements & protection", "/securite"],
        [accountHome ? "Mon espace" : "Se connecter", accountHome ?? "/connexion"],
      ],
    },
    {
      title: "Pour vous",
      links: SOLUTIONS.map<[string, string]>((item) => [item.title, `/solutions/${item.slug}`]),
    },
    {
      title: "À vos côtés",
      links: [
        ["Centre d’aide", "/aide"],
        ["À propos de Wóor", "/a-propos"],
        ["Nous contacter", "/contact"],
      ],
    },
  ];
  return (
    <footer className="m-footer">
      <div className="m-container">
        <div className="m-footer-top">
          <div className="m-footer-brand">
            <WoorBrand light />
            <p>
              Le lien de confiance entre ceux qui vendent, ceux qui achètent et ceux qui livrent.
            </p>
            <span className="m-footer-place">
              <Icon name="pin" size="sm" /> Dakar, Sénégal
            </span>
          </div>
          {groups.map((group) => (
            <div className="m-footer-column" key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map(([label, to]) => (
                <Link to={to} key={to}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
          <div className="m-footer-column">
            <h2>Gardons le lien</h2>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <a href={CONTACT.telephone}>{CONTACT.phone}</a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer">
              Discuter sur WhatsApp
            </a>
          </div>
        </div>
        <div className="m-footer-bottom">
          <span>© {new Date().getFullYear()} Wóor. Le commerce, en confiance.</span>
          <div>
            <Link to="/securite">Protection & confidentialité</Link>
            <a href="https://github.com/kanteMaodo/woor" target="_blank" rel="noreferrer">
              Code source ouvert
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
