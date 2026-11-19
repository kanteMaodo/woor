import { Link } from "react-router";

import { Icon } from "../../components/ui/icon";
import { EscrowDiagram } from "./escrow-diagram";
import { HELP_QUESTIONS, IMAGES, SOLUTIONS } from "./marketing-content";
import { MarketingHero, MarketingLayout, SectionHeading } from "./marketing-layout";
import { ProductJourney } from "./product-journey";

export function LandingPage() {
  return (
    <MarketingLayout>
      <MarketingHero
        home
        eyebrow="Le paiement protégé, pour le commerce en ligne à Dakar"
        title={
          <>
            Vendez en ligne.
            <br />
            <em>La confiance en plus.</em>
          </>
        }
        description="Wóor relie vendeurs, acheteurs et livreurs autour d’une commande protégée. L’argent est bloqué avant le départ. Il est débloqué par un code, à la remise du colis."
        tag="Un lien à partager. Aucun compte à créer pour l’acheteur."
      />
      <div className="m-trust-strip">
        <div className="m-container">
          <span>
            <Icon name="send" /> Un lien dans votre conversation
          </span>
          <span>
            <Icon name="lock" /> Un paiement bloqué
          </span>
          <span>
            <Icon name="box" /> Un colis remis en confiance
          </span>
          <span>
            <Icon name="bolt" /> Propulsé par Lightning
          </span>
        </div>
      </div>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Suivre une commande"
            title="Du premier message au colis en main."
          >
            <p>
              Vous avez déjà le produit et la conversation. Wóor s’occupe du lien de confiance entre
              le paiement et la remise.
            </p>
            <Link className="m-text-link" to="/fonctionnement">
              Explorer le fonctionnement
            </Link>
          </SectionHeading>
          <ProductJourney />
        </div>
      </section>

      <section className="m-section m-soft">
        <div className="m-container">
          <SectionHeading
            eyebrow="Vendeurs, acheteurs, livreurs"
            title="Un espace adapté à chaque rôle."
          >
            <p>
              Chaque personne retrouve les informations et les actions qui la concernent, dans son
              propre espace.
            </p>
          </SectionHeading>
          <div className="m-audience-grid">
            {SOLUTIONS.map((solution, index) => (
              <Link
                to={`/solutions/${solution.slug}`}
                key={solution.slug}
                className={`m-audience-card m-audience-${solution.slug}`}
              >
                <span className="m-audience-symbol">
                  <Icon name={solution.icon} size="lg" />
                </span>
                <p>{solution.title}</p>
                <h3>{solution.short}.</h3>
                <p>{solution.description}</p>
                <div className="m-audience-detail">
                  {index === 0 ? (
                    <>
                      <span className="m-mini-label">COMMANDE CRÉÉE</span>
                      <strong>Le lien est prêt.</strong>
                      <span className="m-mini-url">
                        <Icon name="lock" size="sm" /> woor · Votre commande
                      </span>
                    </>
                  ) : index === 1 ? (
                    <>
                      <span className="m-mini-label">PAIEMENT PROTÉGÉ</span>
                      <strong>Vous gardez le code.</strong>
                      <span className="m-mini-code">4 8 2 &nbsp; 9 1 3</span>
                    </>
                  ) : (
                    <>
                      <span className="m-mini-label">LIVRAISON CONFIRMÉE</span>
                      <strong>Votre course est réglée.</strong>
                      <span className="m-mini-paid">
                        <Icon name="check-circle" /> Paiement confirmé
                      </span>
                    </>
                  )}
                </div>
                <span className="m-card-link">Découvrir mon parcours</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-editorial">
          <div className="m-editorial-photo">
            <img
              src={IMAGES.atelier}
              alt="Illustration d’une commerçante consultant une commande dans son atelier à Dakar"
              loading="lazy"
              width="1672"
              height="941"
            />
            <div className="m-photo-caption">
              <Icon name="pin" size="sm" />
              <span>Ancré dans les échanges du quotidien.</span>
            </div>
          </div>
          <div className="m-editorial-copy">
            <p className="m-eyebrow">Vendre sur vos réseaux</p>
            <h2>Votre boutique est déjà là où l’on vous écrit.</h2>
            <p>
              Une robe sur Instagram. Un prix négocié sur WhatsApp. Une livraison à Sacré-Cœur. Wóor
              s’intègre à cette réalité, sans vous demander de changer votre façon de vendre.
            </p>
            <ul className="m-checklist">
              <li>
                <Icon name="check-circle" />
                Partagez le lien dans la conversation de votre choix.
              </li>
              <li>
                <Icon name="check-circle" />
                Retrouvez l’article, le montant et la livraison au même endroit.
              </li>
              <li>
                <Icon name="check-circle" />
                Préparez le colis quand le paiement est bloqué.
              </li>
            </ul>
            <Link to="/solutions/vendeurs" className="m-button m-button-ink">
              Découvrir Wóor pour ma boutique
            </Link>
          </div>
        </div>
      </section>

      <section className="m-section m-dark">
        <div className="m-container">
          <SectionHeading
            eyebrow="Comprendre le paiement"
            title="Le code confirme la remise et libère le paiement."
          >
            <p>
              Le prix de l’article et celui de la course sont bloqués séparément. Le code de remise
              fait le lien entre le colis reçu et le paiement libéré.
            </p>
            <Link to="/securite" className="m-text-link">
              Comprendre la protection
            </Link>
          </SectionHeading>
          <div className="m-security-layout">
            <EscrowDiagram />
            <div className="m-security-notes">
              <article>
                <Icon name="lock" />
                <div>
                  <h3>Avant la remise : bloqué.</h3>
                  <p>Le vendeur sait que le paiement est prévu, sans l’encaisser d’avance.</p>
                </div>
              </article>
              <article>
                <Icon name="key" />
                <div>
                  <h3>À la remise : confirmé.</h3>
                  <p>Le code à six chiffres de l’acheteur déclenche le déblocage.</p>
                </div>
              </article>
              <article>
                <Icon name="undo" />
                <div>
                  <h3>Sans remise : annulé.</h3>
                  <p>
                    Le paiement bloqué est annulé à l’échéance, selon les règles de la commande.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-conversation-section">
          <div>
            <p className="m-eyebrow">Moins de flou, plus de visibilité</p>
            <h2>
              « C’est payé ? »<br />
              La réponse est dans la commande.
            </h2>
            <p>
              Le vendeur prépare, l’acheteur suit, le livreur confirme. Le même statut permet à
              chacun de savoir où en est l’échange.
            </p>
            <Link to="/fonctionnement" className="m-text-link">
              Découvrir le suivi d’une commande
            </Link>
            <div className="m-channel-list">
              <span>WhatsApp</span>
              <span>Instagram</span>
              <span>TikTok</span>
              <span>Un simple lien</span>
            </div>
          </div>
          <div className="m-message-demo">
            <div className="m-message-header">
              <span className="m-shop-avatar">AC</span>
              <div>
                <strong>Awa Couture</strong>
                <span>Une conversation, pour l’exemple</span>
              </div>
              <Icon name="phone" />
            </div>
            <div className="m-message-bubble">
              Bonjour ! Votre robe est prête. Voici le lien pour confirmer la commande.
              <div className="m-link-preview">
                <Icon name="shield" />
                <div>
                  <strong>Votre commande Wóor</strong>
                  <span>Robe en wax · Livraison à Dakar</span>
                  <b>Paiement protégé jusqu’à la remise</b>
                </div>
              </div>
              <small>10:42</small>
            </div>
            <div className="m-message-status">
              <Icon name="lock" />
              <div>
                <strong>Paiement bloqué</strong>
                <span>Le colis peut maintenant être préparé.</span>
              </div>
              <Icon name="check-circle" />
            </div>
            <p className="m-demo-note">
              Démonstration illustrative. Wóor n’est pas affilié aux messageries citées.
            </p>
          </div>
        </div>
      </section>

      <section className="m-pilot">
        <div className="m-container">
          <div>
            <p className="m-eyebrow">Un pilote, des règles claires</p>
            <h2>
              Les montants et les délais
              <br />à connaître avant de commencer.
            </h2>
            <Link to="/aide" className="m-text-link">
              Consulter les conditions du pilote
            </Link>
          </div>
          <div className="m-pilot-facts">
            <div>
              <strong>6 chiffres</strong>
              <span>pour confirmer la remise</span>
            </div>
            <div>
              <strong>50 000 F</strong>
              <span>maximum par article</span>
            </div>
            <div>
              <strong>18 heures</strong>
              <span>durée maximale du blocage</span>
            </div>
            <div>
              <strong>0 compte</strong>
              <span>à créer pour l’acheteur</span>
            </div>
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading eyebrow="Questions fréquentes" title="Avant votre première commande.">
            <Link to="/aide" className="m-text-link">
              Ouvrir le centre d’aide
            </Link>
          </SectionHeading>
          <div className="m-home-help">
            <div className="m-faq-list">
              {HELP_QUESTIONS.filter((_, index) => [0, 3, 4].includes(index)).map((item) => (
                <details key={item.question}>
                  <summary>
                    {item.question}
                    <Icon name="plus" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <aside className="m-help-card">
              <Icon name="users" size="lg" />
              <h3>Un projet né à Dakar.</h3>
              <p>
                Nous construisons Wóor autour de celles et ceux qui font vivre le commerce local.
              </p>
              <Link to="/a-propos" className="m-text-link">
                Rencontrer le projet
              </Link>
              <Link to="/contact" className="m-text-link">
                Parler à l’équipe
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
