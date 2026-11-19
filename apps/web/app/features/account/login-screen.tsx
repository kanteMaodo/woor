import { Form, Link, useNavigation } from "react-router";

import { Banner } from "../../components/ui/banner";
import { Icon } from "../../components/ui/icon";
import { Logo } from "../../components/ui/logo";

/** Compte de démonstration proposé sur la page de connexion, hors production. */
export interface DemoAccount {
  label: string;
  phone: string;
  pin: string;
}

interface LoginScreenProps {
  error: string | null;
  /** Numéro déjà saisi, rendu après un échec pour ne pas le retaper. */
  phone: string;
  /** Comptes de démonstration, pour que le jury teste sans rien taper. */
  demoAccounts: DemoAccount[];
}

const PROMISES = [
  "L'argent est bloqué avant que le colis parte.",
  "Le code à 6 chiffres débloque le paiement à la remise.",
  "Sans remise, l'acheteur est remboursé tout seul.",
];

/** O2 : connexion des vendeuses et livreurs par numéro et PIN. */
export function LoginScreen({ error, phone, demoAccounts }: LoginScreenProps) {
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";

  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" className="brand auth-brand">
          <Logo />
        </Link>
        <div className="auth-side-body">
          <h2>Vendez sans risque. Livrez sans billets.</h2>
          <ul>
            {PROMISES.map((promise) => (
              <li key={promise}>
                <Icon name="check-circle" />
                {promise}
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-side-foot">
          <Icon name="lock" size="sm" /> Paiements protégés par le réseau Lightning
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="back-link auth-back">
            <Icon name="arrow-left" size="sm" /> Accueil
          </Link>
          <Link to="/" className="brand auth-brand-mobile">
            <Logo />
          </Link>

          <h1>Se connecter</h1>
          <p className="auth-sub">Espace des vendeuses et des livreurs.</p>

          {error && <Banner tone="danger">{error}</Banner>}

          <Form method="post" className="stack">
            <div className="field">
              <label htmlFor="phone">Numéro de téléphone</label>
              <div className="auth-phone">
                <span aria-hidden="true">+221</span>
                <input
                  id="phone"
                  name="phone"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="username"
                  placeholder="77 000 00 01"
                  defaultValue={phone}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pin">PIN à 6 chiffres</label>
              <input
                id="pin"
                name="pin"
                className="input auth-pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                required
              />
              <span className="hint">5 essais, puis le PIN est bloqué 15 minutes.</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Connexion…" : "Se connecter"}
            </button>
          </Form>

          {demoAccounts.length > 0 && (
            <section className="auth-demo" aria-labelledby="demo-title">
              <h2 id="demo-title">
                <Icon name="key" size="sm" /> Comptes de démonstration
              </h2>
              <div className="auth-demo-actions">
                {demoAccounts.map((account) => (
                  <Form method="post" key={account.phone}>
                    <input type="hidden" name="phone" value={account.phone} />
                    <input type="hidden" name="pin" value={account.pin} />
                    <button type="submit" className="btn btn-secondary" disabled={pending}>
                      {account.label}
                    </button>
                  </Form>
                ))}
              </div>
              <p className="hint">
                {demoAccounts
                  .map((account) => `${account.label} : ${account.phone}, PIN ${account.pin}`)
                  .join(" · ")}
              </p>
            </section>
          )}

          <p className="note">Pas de compte ? L'accès se fait sur invitation.</p>
        </div>
      </main>
    </div>
  );
}
