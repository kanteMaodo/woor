import { Link } from "react-router";

import { Icon } from "../../components/ui/icon";
import { Logo } from "../../components/ui/logo";

interface InvitationScreenProps {
  invitedBy: string;
  roleLabel: string;
  phone: string;
}

/** O1 : la personne invitée crée son compte. Pas de mot de passe : son téléphone devient sa clé. */
export function InvitationScreen({ invitedBy, roleLabel, phone }: InvitationScreenProps) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" className="brand auth-brand">
          <Logo />
        </Link>
        <div className="auth-side-body">
          <h2>Dalal ak jàmm. Bienvenue chez Wóor.</h2>
          <ul>
            <li>
              <Icon name="check-circle" />
              Des clients qui ont déjà payé avant le départ du colis.
            </li>
            <li>
              <Icon name="check-circle" />
              Pas de billets à transporter ni à rendre.
            </li>
            <li>
              <Icon name="check-circle" />
              Votre argent est débloqué dès la remise du colis.
            </li>
          </ul>
        </div>
        <p className="auth-side-foot">
          <Icon name="lock" size="sm" /> Paiements protégés par le réseau Lightning
        </p>
      </aside>

      <main className="auth-main">
        <form className="auth-card">
          <Link to="/" className="brand auth-brand-mobile">
            <Logo />
          </Link>
          <h1>Bienvenue sur Wóor</h1>
          <p className="auth-sub">
            {invitedBy} vous invite comme {roleLabel.toLowerCase()}.
          </p>

          <div className="field">
            <label htmlFor="invite-phone">Votre numéro</label>
            <div className="auth-phone">
              <span aria-hidden="true">+221</span>
              <input id="invite-phone" className="input" defaultValue={phone} readOnly />
            </div>
            <span className="hint">Le code d'invitation est réservé à ce numéro.</span>
          </div>
          <div className="field">
            <label htmlFor="invite-name">Nom affiché aux acheteurs</label>
            <input id="invite-name" className="input" placeholder="Moussa" />
            <span className="hint">
              Les acheteurs voient seulement ce prénom et la fin de votre numéro.
            </span>
          </div>

          <div className="trust">
            <b>
              <Icon name="finger" /> Pas de mot de passe
            </b>
            <span className="small">
              Votre téléphone devient votre clé (passkey). Elle ne marche que sur le vrai site Wóor.
            </span>
          </div>

          <button type="button" className="btn btn-primary" disabled title="Bientôt disponible">
            <Icon name="finger" />
            Créer ma passkey
          </button>
          <button type="button" className="btn btn-link" disabled>
            Choisir un PIN à la place
          </button>
        </form>
      </main>
    </div>
  );
}
