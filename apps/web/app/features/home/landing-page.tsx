import { Link } from "react-router";

import { Icon, type IconName } from "../../components/ui/icon";
import { formatXof } from "../../lib/format";
import { OrderProgress } from "../orders/order-progress";

const SOURCE_URL = "https://github.com/kanteMaodo/woor";

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "send",
    title: "La vendeuse envoie un lien",
    text: "Elle décrit l'article, le prix et la livraison, puis partage le lien sur WhatsApp.",
  },
  {
    icon: "lock",
    title: "L'acheteur bloque son paiement",
    text: "Il paie en bitcoin sur Lightning. L'argent est bloqué dans son wallet, pas encaissé.",
  },
  {
    icon: "moto",
    title: "Le livreur remet le colis",
    text: "L'acheteur lui donne un code à 6 chiffres, seulement s'il a bien reçu sa commande.",
  },
  {
    icon: "coin",
    title: "Le code débloque l'argent",
    text: "Vendeuse et livreur sont payés. Si rien n'arrive, l'acheteur est remboursé tout seul.",
  },
];

const GUARANTEES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "lock",
    title: "Bloqué, jamais encaissé",
    text: "Les hold invoices Lightning gardent l'argent chez l'acheteur jusqu'au code. Wóor ne peut pas partir avec.",
  },
  {
    icon: "undo",
    title: "Remboursement automatique",
    text: "Pas de remise à temps, colis refusé, commande annulée : le paiement bloqué est simplement annulé.",
  },
  {
    icon: "key",
    title: "Données chiffrées",
    text: "Numéros, adresses et secrets de paiement sont chiffrés ou réduits à une empreinte avant d'entrer en base.",
  },
  {
    icon: "eye-off",
    title: "Chacun voit sa part",
    text: "La base elle-même limite chaque vendeuse, livreur ou acheteur à ses propres commandes.",
  },
];

/** Page d'accueil : ce qu'est Wóor, comment ça marche, pourquoi on peut lui faire confiance. */
export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-bar">
        <span className="brand">
          <Icon name="bolt" />
          Wóor
        </span>
        <Link to="/connexion" className="landing-login">
          Se connecter
        </Link>
      </header>

      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Commerce en ligne à Dakar · Bitcoin Lightning</p>
          <h1>Votre argent est bloqué, pas encaissé, jusqu'à la remise du colis.</h1>
          <p className="lead">
            Wóor protège les ventes sur WhatsApp, Instagram et TikTok. L'acheteur ne paie pas dans
            le vide, la vendeuse ne livre plus à perte.
          </p>
          <div className="hero-actions">
            <Link to="/connexion" className="btn btn-primary">
              Espace vendeuse et livreur
            </Link>
            <a href="#comment" className="btn btn-secondary">
              Comment ça marche
            </a>
          </div>
        </div>

        <div className="hero-card" aria-hidden="true">
          <div className="trust">
            <p className="small">Robe en wax, taille M</p>
            <div className="amount">{formatXof(13_500)}</div>
            <p className="small">bloqués dans le wallet de l'acheteur</p>
          </div>
          <OrderProgress state="in_transit" />
          <div className="banner info">
            <Icon name="lock" />
            <div>Moussa est en route. Le code à 6 chiffres débloquera le paiement.</div>
          </div>
        </div>
      </section>

      <section className="landing-section problem">
        <h2>À Dakar, vendre en ligne repose sur la confiance</h2>
        <div className="landing-grid two">
          <article className="landing-card">
            <Icon name="wallet" size="lg" />
            <h3>L'acheteur hésite à payer d'avance</h3>
            <p>Il a peur de ne jamais recevoir le colis, ou de recevoir autre chose.</p>
          </article>
          <article className="landing-card">
            <Icon name="box" size="lg" />
            <h3>La vendeuse livre à ses risques</h3>
            <p>
              Au paiement à la livraison, le client refuse ou disparaît, et la course est perdue.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="comment">
        <h2>Comment ça marche</h2>
        <ol className="landing-grid four steps-list">
          {STEPS.map((step, index) => (
            <li key={step.title} className="landing-card">
              <span className="step-number">{index + 1}</span>
              <Icon name={step.icon} size="lg" />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section">
        <h2>Sûr par construction</h2>
        <div className="landing-grid four">
          {GUARANTEES.map((item) => (
            <article key={item.title} className="landing-card">
              <Icon name={item.icon} size="lg" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>Wóor · Dakar Bitcoin Hack 2026</span>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">
          Code source
        </a>
      </footer>
    </div>
  );
}
