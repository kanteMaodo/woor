import type { ReactNode } from "react";

interface WelcomeBannerProps {
  eyebrow: string;
  /** Titre court ; un mot en <em> passe en italique, comme sur le site public. */
  title: ReactNode;
  description: string;
  illustration: ReactNode;
  actions?: ReactNode;
}

/** Bandeau d’accueil d’un espace : une phrase, une action, une illustration. */
export function WelcomeBanner({
  eyebrow,
  title,
  description,
  illustration,
  actions,
}: WelcomeBannerProps) {
  return (
    <section className="welcome">
      <div className="welcome-copy">
        <p className="welcome-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="welcome-text">{description}</p>
        {actions && <div className="welcome-actions">{actions}</div>}
      </div>
      <div className="welcome-art">{illustration}</div>
    </section>
  );
}
