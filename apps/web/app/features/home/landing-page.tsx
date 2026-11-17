import { Link } from "react-router";

import { Icon } from "../../components/ui/icon";
import { EscrowDiagram } from "./escrow-diagram";
import { AUDIENCES, COMPARISON, FACTS, FAQ, GUARANTEES } from "./landing-content";
import { LockedMock, PaidMock, SellerListMock, ShareMock } from "./mockup-screens";

const SOURCE_URL = "https://github.com/kanteMaodo/woor";

const AUDIENCE_MOCKS = {
  acheteur: LockedMock,
  vendeuse: ShareMock,
  livreur: PaidMock,
} as const;

/**
 * Page d'accueil. Structure inspirée des meilleures pages fintech : promesse et produit
 * en tête, chiffres concrets, un chemin par public, preuve de sécurité, FAQ avant l'appel final.
 */
export function LandingPage() {
  return (
    <div className="landing">
      <LandingNav />
      <Hero />
      <FactsBand />
      <ProblemSection />
      <AudienceSection />
      <SecuritySection />
      <ComparisonSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}

function LandingNav() {
  return (
    <header className="l-nav">
      <div className="l-container l-nav-inner">
        <Link to="/" className="brand l-brand">
          <Icon name="bolt" />
          Wóor
        </Link>
        <nav className="l-nav-links" aria-label="Sections">
          <a href="#comment">Comment ça marche</a>
          <a href="#securite">Sécurité</a>
          <a href="#questions">Questions</a>
        </nav>
        <Link to="/connexion" className="l-nav-cta">
          Se connecter
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="l-hero">
      <div className="l-container l-hero-grid">
        <div className="l-hero-text">
          <p className="l-eyebrow">
            <Icon name="bolt" size="sm" />
            Paiement protégé sur Bitcoin Lightning
          </p>
          <h1>
            Vendez en ligne à Dakar. <span>Sans risque pour personne.</span>
          </h1>
          <p className="l-lead">
            L'argent de l'acheteur est bloqué, pas encaissé, jusqu'à la remise du colis. Un code à 6
            chiffres le débloque. Sinon, il revient tout seul.
          </p>
          <div className="l-actions">
            <Link to="/connexion" className="btn btn-primary l-btn">
              Espace vendeuse et livreur
              <Icon name="chev" />
            </Link>
            <a href="#comment" className="btn l-btn l-btn-ghost">
              Voir comment ça marche
            </a>
          </div>
          <ul className="l-pills">
            <li>
              <Icon name="check" size="sm" /> Sans compte pour l'acheteur
            </li>
            <li>
              <Icon name="check" size="sm" /> Remboursement automatique
            </li>
            <li>
              <Icon name="check" size="sm" /> Pensé pour WhatsApp
            </li>
          </ul>
        </div>

        <div className="l-hero-visual">
          <SellerListMock className="l-phone-back" />
          <LockedMock className="l-phone-front" />
          <div className="l-float l-float-top" aria-hidden="true">
            <span className="l-float-icon ok">
              <Icon name="lock" />
            </span>
            <div>
              <b>Paiement bloqué</b>
              <span>13 500 F · Robe en wax</span>
            </div>
          </div>
          <div className="l-float l-float-bottom" aria-hidden="true">
            <span className="l-float-icon btc">
              <Icon name="bolt" />
            </span>
            <div>
              <b>Code juste, argent débloqué</b>
              <span>Vendeuse et livreur payés</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FactsBand() {
  return (
    <section className="l-facts" aria-label="Les règles du pilote en chiffres">
      <div className="l-container l-facts-grid">
        {FACTS.map((fact) => (
          <div key={fact.value} className="l-fact">
            <b>{fact.value}</b>
            <span>{fact.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="l-section">
      <div className="l-container">
        <p className="l-kicker">Le problème</p>
        <h2>À Dakar, la vente en ligne repose sur la confiance. Et la confiance se perd vite.</h2>
        <div className="l-grid two">
          <article className="l-card l-card-problem">
            <Icon name="wallet" size="lg" />
            <h3>Payer d'avance ? L'acheteur hésite.</h3>
            <p>
              Il a vu trop de vendeurs disparaître après le virement. Il préfère ne pas commander.
            </p>
          </article>
          <article className="l-card l-card-problem">
            <Icon name="moto" size="lg" />
            <h3>Payer à la livraison ? La vendeuse perd.</h3>
            <p>
              Le client refuse à la porte ou ne répond plus. La course est perdue, le livreur rentre
              avec le colis et des billets en poche.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className="l-section l-tinted" id="comment">
      <div className="l-container">
        <p className="l-kicker">Comment ça marche</p>
        <h2>Un lien, un paiement bloqué, un code. Chacun y gagne.</h2>
        <div className="l-rows">
          {AUDIENCES.map((audience, index) => {
            const Mock = AUDIENCE_MOCKS[audience.key as keyof typeof AUDIENCE_MOCKS];
            return (
              <article key={audience.key} className={`l-row${index % 2 ? " reverse" : ""}`}>
                <div className="l-row-text">
                  <span className="l-row-icon">
                    <Icon name={audience.icon} size="lg" />
                  </span>
                  <p className="l-row-title">{audience.title}</p>
                  <h3>{audience.promise}</h3>
                  <ul className="l-checks">
                    {audience.points.map((point) => (
                      <li key={point}>
                        <Icon name="check-circle" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="l-row-visual">
                  <Mock />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="l-section l-dark" id="securite">
      <div className="l-container">
        <p className="l-kicker">Sécurité</p>
        <h2>Sûr par construction, pas par promesse.</h2>
        <p className="l-section-lead">
          Wóor ne garde jamais l'argent : il reste bloqué sur le réseau Lightning jusqu'au code.
        </p>
        <EscrowDiagram />
        <div className="l-grid four">
          {GUARANTEES.map((item) => (
            <article key={item.title} className="l-card l-card-dark">
              <Icon name={item.icon} size="lg" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="l-section">
      <div className="l-container">
        <p className="l-kicker">Pourquoi Wóor</p>
        <h2>Le meilleur des deux façons de payer, sans leurs risques.</h2>
        <div className="l-table-wrap">
          <table className="l-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Critère</span>
                </th>
                {COMPARISON.columns.map((column) => (
                  <th key={column} scope="col" className={column === "Wóor" ? "hl" : undefined}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={COMPARISON.columns[index]} className={index === 2 ? "hl" : undefined}>
                      {value ? (
                        <span className="yes">
                          <Icon name="check" size="sm" />
                          <span className="sr-only">Oui</span>
                        </span>
                      ) : (
                        <span className="no">
                          <Icon name="x" size="sm" />
                          <span className="sr-only">Non</span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="l-section l-tinted" id="questions">
      <div className="l-container l-faq-grid">
        <div>
          <p className="l-kicker">Questions</p>
          <h2>Ce qu'on nous demande le plus.</h2>
        </div>
        <div className="l-faq">
          {FAQ.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question}
                <Icon name="plus" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="l-cta">
      <div className="l-container l-cta-inner">
        <h2>Votre prochaine vente, sans risque.</h2>
        <p>Créez un lien protégé en moins d'une minute et envoyez-le sur WhatsApp.</p>
        <Link to="/connexion" className="btn l-btn l-btn-light">
          Accéder à mon espace
          <Icon name="chev" />
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="l-footer">
      <div className="l-container l-footer-inner">
        <span className="brand">
          <Icon name="bolt" />
          Wóor
        </span>
        <span>Dakar Bitcoin Hack 2026 · Pilote à Dakar</span>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">
          Code source sur GitHub
        </a>
      </div>
    </footer>
  );
}
