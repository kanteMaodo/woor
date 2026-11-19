import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";

import { Banner } from "../../components/ui/banner";
import { Icon } from "../../components/ui/icon";
import { ValidatedForm } from "../../components/ui/validated-form";
import { LoginFormSchema } from "../../lib/form-validation";
import { WoorBrand } from "../home/marketing-layout";

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
  "Une commande claire, du premier message à la remise.",
  "Un paiement protégé, avant de prendre la route.",
  "Un code à six chiffres pour confirmer la livraison.",
];

/** O2 : connexion des vendeuses et livreurs par numéro et PIN. */
export function LoginScreen({ error, phone, demoAccounts }: LoginScreenProps) {
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="auth">
      <aside className="auth-side">
        <WoorBrand light />
        <div className="auth-side-body">
          <p className="auth-eyebrow">LE COMMERCE, EN CONFIANCE.</p>
          <h2>
            Vos commandes.
            <br />
            <em>Vos livraisons.</em>
          </h2>
          <p className="auth-side-intro">
            Retrouvez vos commandes, vos livraisons et les informations qui font avancer votre
            activité.
          </p>
          <ul>
            {PROMISES.map((promise) => (
              <li key={promise}>
                <Icon name="check-circle" />
                {promise}
              </li>
            ))}
          </ul>
        </div>
        <div className="auth-proof">
          <span>
            <Icon name="lock" />
          </span>
          <div>
            <strong>Le code confirme la remise.</strong>
            <p>Protégé avant le départ. Débloqué à la remise.</p>
          </div>
        </div>
        <p className="auth-side-foot">
          <Icon name="pin" size="sm" /> Né à Dakar · Propulsé par Bitcoin Lightning
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="back-link auth-back">
            Retour au site
          </Link>
          <div className="auth-brand-mobile">
            <WoorBrand />
          </div>

          <span className="auth-welcome">VOTRE ESPACE WÓOR</span>
          <h1>Content de vous retrouver.</h1>
          <p className="auth-sub">Connectez-vous pour retrouver vos commandes et vos courses.</p>

          {error && <Banner tone="danger">{error}</Banner>}

          <ValidatedForm
            method="post"
            schema={LoginFormSchema}
            className="stack"
            aria-busy={pending}
          >
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
                  maxLength={30}
                  defaultValue={phone}
                  required
                />
              </div>
            </div>
            <div className="field">
              <div className="auth-field-heading">
                <label htmlFor="pin">Votre PIN à 6 chiffres</label>
                <Link to="/contact">Besoin d’aide ?</Link>
              </div>
              <div className="auth-pin-field">
                <input
                  id="pin"
                  name="pin"
                  className="input auth-pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  className="auth-pin-toggle"
                  aria-label={showPin ? "Masquer le PIN" : "Afficher le PIN"}
                  aria-pressed={showPin}
                  onClick={() => setShowPin(!showPin)}
                >
                  <Icon name={showPin ? "eye-off" : "eye"} />
                </button>
              </div>
              <span className="hint">5 essais, puis le PIN est bloqué 15 minutes.</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Connexion en cours…" : "Accéder à mon espace"}
            </button>
          </ValidatedForm>

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
              <p className="hint auth-demo-credentials">
                {demoAccounts
                  .map((account) => `${account.label} : ${account.phone}, PIN ${account.pin}`)
                  .join(" · ")}
              </p>
            </section>
          )}

          <p className="auth-invitation">
            Vous souhaitez rejoindre Wóor ?<br />
            <Link to="/contact">Parlez-nous de votre activité.</Link>
            <span>L’accès vendeur et livreur se fait sur invitation.</span>
          </p>
          <div className="auth-bottom-links">
            <Link to="/aide">Centre d’aide</Link>
            <span>·</span>
            <Link to="/securite">Protection des données</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
