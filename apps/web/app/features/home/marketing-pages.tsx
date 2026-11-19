import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";

import { Icon } from "../../components/ui/icon";
import type { IconName } from "../../components/ui/icon";
import { EscrowDiagram } from "./escrow-diagram";
import { CONTACT, HELP_QUESTIONS, IMAGES, PAGE_CONTENT, SOLUTIONS } from "./marketing-content";
import type { MarketingPageKey } from "./marketing-content";
import { MarketingHero, MarketingLayout, SectionHeading } from "./marketing-layout";
import { LockedMock, PaidMock, SellerListMock, ShareMock } from "./mockup-screens";
import { ProductJourney } from "./product-journey";

export function MarketingPage({ pageKey }: { pageKey: MarketingPageKey }) {
  const page = PAGE_CONTENT[pageKey];
  const contact = pageKey === "contact";
  return (
    <MarketingLayout>
      <MarketingHero
        eyebrow={page.label}
        title={page.title}
        description={page.description}
        image={page.image}
        tag={page.tag}
        action={
          contact
            ? { to: CONTACT.whatsapp, label: "Discuter sur WhatsApp" }
            : pageKey === "aide"
              ? { to: "/contact", label: "Contacter l’équipe" }
              : pageKey === "acheteurs"
                ? { to: "/aide", label: "Préparer mon achat" }
                : pageKey === "a-propos"
                  ? { to: "/contact", label: "Échanger avec l’équipe" }
                  : pageKey === "securite"
                    ? { to: "/fonctionnement", label: "Comprendre le parcours" }
                    : undefined
        }
        secondaryAction={
          contact
            ? { to: `mailto:${CONTACT.email}`, label: "Écrire un e-mail" }
            : pageKey === "aide"
              ? { to: "/fonctionnement", label: "Comprendre le parcours" }
              : pageKey === "a-propos"
                ? { to: "/fonctionnement", label: "Découvrir le fonctionnement" }
                : undefined
        }
      />
      {pageKey === "fonctionnement" ? (
        <HowItWorks />
      ) : pageKey === "securite" ? (
        <SecurityPage />
      ) : pageKey === "aide" ? (
        <HelpPage />
      ) : pageKey === "a-propos" ? (
        <AboutPage />
      ) : contact ? (
        <ContactPage />
      ) : (
        <SolutionPage audience={pageKey as AudienceKey} />
      )}
    </MarketingLayout>
  );
}

function FeatureList({ items }: { items: { icon: IconName; title: string; text: string }[] }) {
  return (
    <div className="m-feature-list">
      {items.map((item) => (
        <article key={item.title}>
          <span className="m-feature-icon">
            <Icon name={item.icon} />
          </span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function HowItWorks() {
  return (
    <>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Tout commence par un lien"
            title="Une commande. Un parcours lisible."
          >
            <p>
              Explorez les étapes ci-dessous. Cet exemple montre comment le vendeur, l’acheteur et
              le livreur avancent ensemble.
            </p>
          </SectionHeading>
          <ProductJourney />
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container m-two-columns">
          <div>
            <p className="m-eyebrow">Deux montants, deux destinations</p>
            <h2>Le produit et la course ont chacun leur paiement.</h2>
            <p>
              Pour une robe à 12 000 F et une livraison à 1 500 F, l’acheteur voit le total avant de
              confirmer. Les factures Lightning distinguent ensuite l’article et la course.
            </p>
            <p>
              Cette séparation permet de gérer les situations où le colis est refusé, tout en
              traitant la rémunération du livreur selon les règles de la commande.
            </p>
            <Link to="/securite" className="m-text-link">
              Comprendre les règles de déblocage
            </Link>
          </div>
          <div className="m-invoice">
            <p className="m-eyebrow">Exemple de commande</p>
            <h3>Une robe en wax. Une livraison à Dakar.</h3>
            <div>
              <span>
                <Icon name="box" /> L’article
              </span>
              <strong>12 000 F CFA</strong>
            </div>
            <div>
              <span>
                <Icon name="moto" /> La course
              </span>
              <strong>1 500 F CFA</strong>
            </div>
            <div className="m-invoice-total">
              <span>Total affiché</span>
              <strong>13 500 F CFA</strong>
            </div>
            <p>
              <Icon name="bolt" size="sm" /> Paiement en bitcoin via Lightning. La conversion est
              affichée au moment de payer.
            </p>
          </div>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Et si le parcours change ?"
            title="Les situations sont prévues. Les règles sont visibles."
          />
          <div className="m-scenario-grid">
            <article>
              <Icon name="check-circle" size="lg" />
              <h3>Le colis est remis</h3>
              <p>
                L’acheteur communique son code au livreur lors de la remise. Le paiement de
                l’article et de la course est débloqué.
              </p>
            </article>
            <article>
              <Icon name="clock" size="lg" />
              <h3>La remise n’a pas lieu</h3>
              <p>
                Le paiement bloqué est annulé à l’échéance prévue. L’écran de commande indique la
                situation et les actions disponibles.
              </p>
            </article>
            <article>
              <Icon name="alert" size="lg" />
              <h3>Le colis est refusé</h3>
              <p>
                Ne validez pas de code de remise. Contactez l’équipe pour connaître la marche à
                suivre et le traitement de l’article et de la course.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="m-section m-dark">
        <div className="m-container">
          <SectionHeading eyebrow="Avant de commencer" title="Les repères du pilote à Dakar.">
            <p>
              Un cadre volontairement limité pour découvrir le service avec des montants et des
              délais explicites.
            </p>
          </SectionHeading>
          <div className="m-boundaries">
            <div>
              <Icon name="box" />
              <h3>500 à 50 000 F</h3>
              <p>Prix autorisé pour un article.</p>
            </div>
            <div>
              <Icon name="moto" />
              <h3>500 à 10 000 F</h3>
              <p>Frais de livraison par commande.</p>
            </div>
            <div>
              <Icon name="clock" />
              <h3>15 minutes</h3>
              <p>Pour payer les factures avant leur expiration.</p>
            </div>
            <div>
              <Icon name="lock" />
              <h3>18 heures</h3>
              <p>Durée maximale du paiement bloqué.</p>
            </div>
          </div>
          <p className="m-dark-footnote">
            Les montants sont affichés en F CFA. Un wallet Bitcoin Lightning est nécessaire pour
            payer.
          </p>
        </div>
      </section>
    </>
  );
}

const AUDIENCE_CONTENT = {
  vendeurs: {
    eyebrow: "Votre activité, mieux accompagnée",
    title: "Gardez la relation client. Ajoutez un cadre à chaque vente.",
    intro:
      "Vous connaissez vos articles et vos clients. Wóor rassemble les informations de la vente, protège le paiement et vous aide à préparer les bonnes commandes.",
    features: [
      {
        icon: "send" as const,
        title: "Un lien qui contient l’essentiel",
        text: "Article, prix, livraison : votre client retrouve une commande précise, au-delà des messages échangés.",
      },
      {
        icon: "eye" as const,
        title: "Un statut pour décider",
        text: "Vérifiez que le paiement est bloqué avant de confier le colis au livreur associé.",
      },
      {
        icon: "wallet" as const,
        title: "Une remise qui déclenche le paiement",
        text: "Le bon code confirme la livraison. L’article et la course sont alors réglés à leurs destinataires.",
      },
    ],
    steps: [
      ["Préparez la commande", "Indiquez l’article, son prix, les frais et le livreur associé."],
      [
        "Partagez votre lien",
        "Copiez-le dans votre conversation avec le client et attendez le blocage du paiement.",
      ],
      ["Suivez la remise", "Consultez l’avancement de la commande depuis votre espace vendeur."],
    ],
    noteTitle: "Vos commandes, sans les chercher dans dix conversations.",
    note: "Le tableau de bord réunit les commandes et leur statut. Vous savez ce qui attend un paiement, ce qui est en route et ce qui a été remis.",
    account:
      "L’espace vendeur est accessible sur invitation. Contactez l’équipe pour parler de votre boutique et des conditions du pilote.",
  },
  acheteurs: {
    eyebrow: "Votre achat, en toute clarté",
    title: "Vous savez ce que vous achetez. Et quand le paiement se débloque.",
    intro:
      "Pas de nouveau compte à créer. Votre lien de commande vous accompagne depuis le paiement jusqu’à la remise, avec les informations utiles au même endroit.",
    features: [
      {
        icon: "box" as const,
        title: "Les détails avant de payer",
        text: "Relisez l’article, le prix et les frais de livraison avant de confirmer votre commande.",
      },
      {
        icon: "lock" as const,
        title: "Le paiement reste en attente",
        text: "Le prix de l’article n’est pas encaissé par le vendeur tant que la remise n’est pas confirmée.",
      },
      {
        icon: "key" as const,
        title: "Le code reste entre vos mains",
        text: "Donnez-le au livreur uniquement lorsque le colis vous est remis, jamais à l’avance.",
      },
    ],
    steps: [
      [
        "Ouvrez le lien du vendeur",
        "Vérifiez votre commande et indiquez les informations nécessaires à la livraison.",
      ],
      [
        "Bloquez votre paiement",
        "Suivez les deux factures dans votre wallet compatible Bitcoin Lightning.",
      ],
      [
        "Confirmez à la remise",
        "Retrouvez votre code dans la commande et donnez-le au livreur au bon moment.",
      ],
    ],
    noteTitle: "Un code à garder pour le bon moment.",
    note: "Ce code est votre confirmation de remise. Ne le partagez pas par messagerie avant la livraison. Gardez le lien et utilisez le même navigateur pour retrouver votre suivi.",
    account:
      "Pour acheter, demandez un lien de commande au vendeur. Vous n’avez pas besoin d’accéder à la connexion réservée aux vendeurs et aux livreurs.",
  },
  livreurs: {
    eyebrow: "Votre course, avec les bons repères",
    title: "Les bonnes informations avant de prendre la route.",
    intro:
      "Une commande identifiée, un paiement prévu et un geste de confirmation à l’arrivée : Wóor vous accompagne du ramassage jusqu’à la remise.",
    features: [
      {
        icon: "pin" as const,
        title: "La livraison dans votre espace",
        text: "Retrouvez les courses qui vous sont attribuées et les informations nécessaires à la remise.",
      },
      {
        icon: "scan" as const,
        title: "Le ramassage est confirmé",
        text: "Confirmez la prise en charge depuis le parcours de la course, avec les informations du vendeur.",
      },
      {
        icon: "key" as const,
        title: "Le code remplace l’encaissement en espèces",
        text: "À la remise, saisissez le code donné par l’acheteur pour confirmer et déclencher le paiement.",
      },
    ],
    steps: [
      [
        "Consultez votre course",
        "Vérifiez le colis, la destination et le montant de livraison prévu.",
      ],
      ["Confirmez le ramassage", "Le vendeur a préparé la commande. Confirmez sa prise en charge."],
      [
        "Validez à la porte",
        "Le client vous donne les six chiffres lors de la remise. Saisissez-les dans la course.",
      ],
    ],
    noteTitle: "Un imprévu doit être signalé.",
    note: "Client absent, colis refusé ou code bloqué : ne confirmez pas une remise qui n’a pas eu lieu. Gardez le lien de la course et contactez l’équipe pour connaître la marche à suivre.",
    account:
      "Les livreurs accèdent au service sur invitation et sont associés aux vendeurs. Contactez l’équipe pour connaître les possibilités du pilote.",
  },
} as const;
type AudienceKey = keyof typeof AUDIENCE_CONTENT;

function SolutionPage({ audience }: { audience: AudienceKey }) {
  const content = AUDIENCE_CONTENT[audience];
  const Mock =
    audience === "vendeurs" ? ShareMock : audience === "acheteurs" ? LockedMock : PaidMock;
  return (
    <>
      <section className="m-section">
        <div className="m-container m-two-columns">
          <div>
            <p className="m-eyebrow">{content.eyebrow}</p>
            <h2>{content.title}</h2>
            <p>{content.intro}</p>
            <FeatureList items={[...content.features]} />
          </div>
          <div className="m-phone-stage">
            <span className="m-demo-label">Aperçu illustratif de l’application</span>
            <Mock />
            <div className="m-phone-stage-caption">
              <Icon name={audience === "acheteurs" ? "shield" : "check-circle"} />
              <p>
                {audience === "vendeurs"
                  ? "Un lien à partager, une commande à suivre."
                  : audience === "acheteurs"
                    ? "Votre code vous accompagne jusqu’à la remise."
                    : "Une remise confirmée. Une course terminée."}
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container">
          <SectionHeading
            eyebrow="Dans votre quotidien"
            title={
              audience === "vendeurs"
                ? "De votre première commande à sa remise."
                : audience === "acheteurs"
                  ? "Votre prochain achat, étape par étape."
                  : "Du ramassage au dernier kilomètre."
            }
          />
          <div className="m-operating-flow">
            {content.steps.map(([title, text], index) => (
              <article key={title}>
                <span className="m-feature-icon">
                  <Icon name={index === 0 ? "box" : index === 1 ? "send" : "check-circle"} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container m-two-columns">
          <div className="m-role-detail">
            <p className="m-eyebrow">Le détail qui compte</p>
            <h2>{content.noteTitle}</h2>
            <p>{content.note}</p>
            <Link to={audience === "livreurs" ? "/aide" : "/securite"} className="m-text-link">
              {audience === "livreurs"
                ? "Consulter le guide des livreurs"
                : "Mieux comprendre la protection"}
            </Link>
          </div>
          {audience === "vendeurs" ? (
            <div className="m-secondary-phone">
              <SellerListMock />
              <span className="m-demo-note">Montants et commandes fictifs.</span>
            </div>
          ) : (
            <div className="m-good-practice">
              <Icon name={audience === "acheteurs" ? "key" : "alert"} size="xl" />
              <h3>
                {audience === "acheteurs"
                  ? "Le code ne se donne qu’à la remise."
                  : "Un code ne se devine pas."}
              </h3>
              <p>
                {audience === "acheteurs"
                  ? "Ni capture d’écran à envoyer au vendeur, ni code transmis au livreur pendant son trajet. Attendez le colis."
                  : "Cinq essais incorrects verrouillent la saisie. En cas de doute, vérifiez avec l’acheteur et suivez les indications de la course."}
              </p>
            </div>
          )}
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container">
          <div className="m-access-note">
            <Icon name="info" size="lg" />
            <div>
              <h2>
                {audience === "acheteurs"
                  ? "Pour commencer, le lien suffit."
                  : "Rejoindre le pilote Wóor."}
              </h2>
              <p>{content.account}</p>
            </div>
            <Link to="/contact" className="m-button">
              Parler à l’équipe
            </Link>
          </div>
          <div className="m-related">
            <h3>Découvrez aussi les autres parcours</h3>
            {SOLUTIONS.filter((item) => item.slug !== audience).map((item) => (
              <Link key={item.slug} to={`/solutions/${item.slug}`}>
                <Icon name={item.icon} />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SecurityPage() {
  return (
    <>
      <section className="m-section m-dark">
        <div className="m-container">
          <SectionHeading eyebrow="Le chemin du paiement" title="Bloquer n’est pas encaisser.">
            <p>
              Wóor s’appuie sur des factures Lightning dont le règlement reste en attente. La
              confirmation de remise déclenche leur encaissement ; sinon, une annulation rend les
              fonds disponibles.
            </p>
          </SectionHeading>
          <EscrowDiagram />
          <div className="m-boundaries">
            <div>
              <Icon name="lock" />
              <h3>En attente</h3>
              <p>Le paiement est bloqué avant le départ du colis.</p>
            </div>
            <div>
              <Icon name="key" />
              <h3>Confirmé</h3>
              <p>Le code de remise permet de débloquer les paiements.</p>
            </div>
            <div>
              <Icon name="undo" />
              <h3>Annulé</h3>
              <p>Sans remise, les échéances et les règles de la commande s’appliquent.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Des différences concrètes"
            title="Choisir un paiement, c’est aussi choisir ses règles."
          />
          <p className="m-table-hint">
            Sur petit écran, faites défiler le tableau horizontalement.
          </p>
          <div
            className="m-table-scroll"
            role="region"
            aria-label="Comparaison des modes de paiement"
            tabIndex={0}
          >
            <table className="m-comparison">
              <caption>Comparaison des parcours de paiement</caption>
              <thead>
                <tr>
                  <th scope="col">Ce qui compte</th>
                  <th scope="col">Paiement direct à l’avance</th>
                  <th scope="col">Espèces à la livraison</th>
                  <th scope="col">Avec Wóor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Quand le paiement de l’article est-il confirmé ?</th>
                  <td>Avant la livraison</td>
                  <td>Lors de l’encaissement</td>
                  <td>Après confirmation par le code</td>
                </tr>
                <tr>
                  <th scope="row">Avant le départ</th>
                  <td>Le montant est déjà transféré</td>
                  <td>Le paiement reste à collecter</td>
                  <td>Le paiement est bloqué</td>
                </tr>
                <tr>
                  <th scope="row">Espèces transportées par le livreur</th>
                  <td>Selon l’accord</td>
                  <td>Oui</td>
                  <td>Aucune pour la commande Wóor</td>
                </tr>
                <tr>
                  <th scope="row">En cas de non-remise</th>
                  <td>À convenir avec le vendeur</td>
                  <td>Selon les conditions de la course</td>
                  <td>Annulation selon les règles prévues</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container m-two-columns">
          <div>
            <p className="m-eyebrow">La protection ne s’arrête pas au paiement</p>
            <h2>Les informations utiles. Aux bonnes personnes.</h2>
            <p>
              Le vendeur, le livreur et l’acheteur n’ont pas besoin d’accéder aux mêmes données. Les
              espaces de Wóor sont conçus autour de ces rôles.
            </p>
          </div>
          <FeatureList
            items={[
              {
                icon: "eye-off",
                title: "Des accès limités aux commandes concernées",
                text: "Chaque rôle dispose de droits dédiés. Les contrôles d’accès sont aussi appliqués dans la base de données.",
              },
              {
                icon: "pin",
                title: "Des adresses chiffrées",
                text: "L’adresse de livraison est chiffrée avant son enregistrement. Elle sert au traitement de la commande.",
              },
              {
                icon: "finger",
                title: "Des accès personnels",
                text: "Les PIN sont protégés par hachage. Le numéro de téléphone est représenté par une empreinte dans la base.",
              },
            ]}
          />
        </div>
      </section>
      <section className="m-section">
        <div className="m-container m-security-bottom">
          <div>
            <p className="m-eyebrow">Le bon réflexe</p>
            <h2>Votre code de remise ne se partage pas à l’avance.</h2>
            <p>
              Wóor confirme la remise d’un colis ; le service ne certifie pas l’authenticité de
              chaque article et ne remplace pas votre vérification du vendeur. Relisez la commande,
              les montants et les règles avant de payer.
            </p>
            <Link to="/aide" className="m-text-link">
              Lire les réponses sur les paiements
            </Link>
          </div>
          <aside className="m-help-card">
            <Icon name="shield" size="lg" />
            <h3>Un doute sur une commande ?</h3>
            <p>
              Gardez votre lien de commande. Contactez l’équipe sans transmettre votre PIN, votre
              code de remise ni les secrets de votre wallet.
            </p>
            <Link to="/contact" className="m-button">
              Demander de l’aide
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}

function HelpPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tout");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");
  const questions = HELP_QUESTIONS.filter(
    (item) =>
      (category === "Tout" || category === item.category) &&
      normalize(`${item.question} ${item.answer}`).includes(normalize(query.trim())),
  );
  return (
    <>
      <section className="m-section">
        <div className="m-container m-help-container">
          <div className="m-help-search">
            <label htmlFor="help-search">Votre question commence ici.</label>
            <div>
              <Icon name="search" />
              <input
                id="help-search"
                type="search"
                placeholder="Essayez « code », « wallet », « livraison »…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="m-help-filters" role="group" aria-label="Filtrer les questions par sujet">
            {["Tout", "Acheter", "Vendre", "Livrer", "Paiement", "Compte"].map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="m-search-count" role="status">
            {questions.length} réponse{questions.length > 1 ? "s" : ""}{" "}
            {query ? "pour votre recherche" : "à consulter"}
          </p>
          <div className="m-faq-list">
            {questions.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <Icon name="plus" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
          {questions.length === 0 && (
            <div className="m-empty-search">
              <Icon name="search" size="lg" />
              <h2>Aucune réponse pour cette recherche.</h2>
              <p>Essayez un autre mot ou écrivez directement à notre équipe.</p>
              <button
                type="button"
                className="m-button"
                onClick={() => {
                  setQuery("");
                  setCategory("Tout");
                }}
              >
                Afficher toutes les réponses
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container m-two-columns">
          <div>
            <p className="m-eyebrow">Pour aller plus loin</p>
            <h2>Besoin d’un accompagnement plus personnel ?</h2>
            <p>
              Pour une commande en cours, gardez le lien et précisez le statut affiché. Ne partagez
              jamais votre PIN ou votre code de remise avec le support.
            </p>
          </div>
          <div className="m-contact-options">
            <a href={`mailto:${CONTACT.email}`}>
              <Icon name="send" />
              <span>
                <strong>Écrivez à l’équipe</strong>
                <span>{CONTACT.email}</span>
              </span>
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer">
              <Icon name="phone" />
              <span>
                <strong>Discutons sur WhatsApp</strong>
                <span>{CONTACT.phone}</span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function AboutPage() {
  return (
    <>
      <section className="m-section">
        <div className="m-container m-manifesto">
          <p className="m-eyebrow">Notre point de départ</p>
          <h2>
            Faciliter les ventes en ligne.
            <br />
            <span>Protéger les personnes qui les rendent possibles.</span>
          </h2>
          <div>
            <p>
              À Dakar, des commerces vivent au rythme des messages, des recommandations et des
              livraisons. Une photo donne envie. Une conversation précise la commande. Puis arrive
              la question du paiement.
            </p>
            <p>
              Faut-il payer avant de recevoir ? Envoyer un colis sans savoir s’il sera accepté ?
              Transporter l’argent de plusieurs courses ? Wóor apporte un cadre partagé à ce moment
              où chacun prend un risque.
            </p>
          </div>
        </div>
      </section>
      <section className="m-about-image">
        <img
          src={IMAGES.dakar}
          alt="Illustration d’une rue commerçante de Dakar ouverte sur l’océan"
          loading="lazy"
          width="1672"
          height="941"
        />
        <div className="m-container">
          <p>
            Des échanges de proximité.
            <br />
            Une ambition de confiance.
          </p>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Ce qui nous guide"
            title="Construire autour des gens. Garder les règles lisibles."
          />
          <div className="m-values">
            <article>
              <Icon name="users" size="lg" />
              <h3>Personne n’est oublié.</h3>
              <p>
                La protection de l’acheteur ne doit pas effacer le travail du vendeur ni celui du
                livreur. Le parcours tient compte des trois rôles.
              </p>
            </article>
            <article>
              <Icon name="eye" size="lg" />
              <h3>La clarté fait partie du produit.</h3>
              <p>
                Un prix visible, un statut compréhensible, un code à donner au bon moment. La
                confiance grandit quand on sait ce qui se passe.
              </p>
            </article>
            <article>
              <Icon name="send" size="lg" />
              <h3>Les habitudes ont leur place.</h3>
              <p>
                Les commerçants ont déjà leurs canaux et leurs clients. Un lien de commande complète
                la conversation, sans la remplacer.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container m-two-columns">
          <div>
            <p className="m-eyebrow">Aujourd’hui, un pilote à Dakar</p>
            <h2>Commencer près du terrain. Apprendre à chaque échange.</h2>
            <p>
              Wóor est un projet développé dans le cadre de Dakar Bitcoin Hack 2026. Le pilote
              explore le paiement bloqué sur Bitcoin Lightning pour les ventes en ligne et les
              livraisons locales.
            </p>
            <p>
              Le service reste limité à ce cadre : montants encadrés, accès des vendeurs et des
              livreurs sur invitation, et paiements Lightning. Nous préférons des limites explicites
              à des promesses imprécises.
            </p>
            <Link to="/contact" className="m-button">
              Participer à la conversation
            </Link>
          </div>
          <div className="m-project-note">
            <h3>Wóor</h3>
            <p>Un lien de confiance entre le paiement et la remise.</p>
            <hr />
            <span>Dakar, Sénégal</span>
            <span>Bitcoin Lightning</span>
            <a href="https://github.com/kanteMaodo/woor" target="_blank" rel="noreferrer">
              Découvrir le code source ouvert
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactPage() {
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  function prepareMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setDraft({
      subject: `Wóor — ${String(values.get("subject"))}`,
      body: `Bonjour l’équipe Wóor,\n\n${String(values.get("message"))}\n\n${String(values.get("name"))}\nAdresse de réponse : ${String(values.get("email"))}\nProfil : ${String(values.get("profile"))}`,
    });
    setCopied(false);
    setCopyError(false);
  }
  async function copyMessage() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <>
      <section className="m-section">
        <div className="m-container m-contact-layout">
          <div>
            <p className="m-eyebrow">Choisissez votre façon de nous parler</p>
            <h2>Un vrai échange commence par un message.</h2>
            <p>
              Une question sur une commande, l’envie de rejoindre le pilote ou une idée de
              collaboration ? Dites-nous ce qui vous amène.
            </p>
            <div className="m-contact-options">
              <a href={`mailto:${CONTACT.email}`}>
                <Icon name="send" />
                <span>
                  <strong>Par e-mail</strong>
                  <span>{CONTACT.email}</span>
                </span>
              </a>
              <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer">
                <Icon name="phone" />
                <span>
                  <strong>Sur WhatsApp</strong>
                  <span>{CONTACT.phone}</span>
                </span>
              </a>
              <a href={CONTACT.telephone}>
                <Icon name="phone" />
                <span>
                  <strong>Par téléphone</strong>
                  <span>{CONTACT.phone}</span>
                </span>
              </a>
            </div>
            <p className="m-contact-location">
              <Icon name="pin" /> Dakar, Sénégal · Service en phase pilote
            </p>
          </div>
          <div className="m-contact-form-card">
            <h2>Préparons votre message.</h2>
            <p>
              Ce formulaire prépare un e-mail. Vous confirmez son envoi depuis votre messagerie.
            </p>
            <form onSubmit={prepareMessage} className="m-contact-form">
              <div className="m-form-row">
                <label>
                  Votre nom
                  <input
                    required
                    name="name"
                    autoComplete="name"
                    placeholder="Votre nom"
                    maxLength={100}
                  />
                </label>
                <label>
                  Votre adresse e-mail
                  <input
                    required
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    maxLength={200}
                  />
                </label>
              </div>
              <div className="m-form-row">
                <label>
                  Vous êtes
                  <select name="profile">
                    <option>Vendeur ou vendeuse</option>
                    <option>Acheteur ou acheteuse</option>
                    <option>Livreur ou livreuse</option>
                    <option>Partenaire / autre</option>
                  </select>
                </label>
                <label>
                  Votre sujet
                  <select name="subject">
                    <option>Découvrir Wóor</option>
                    <option>Rejoindre le pilote</option>
                    <option>Question sur une commande</option>
                    <option>Accès à mon compte</option>
                    <option>Partenariat</option>
                  </select>
                </label>
              </div>
              <label>
                Votre message
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  placeholder="Présentez-nous votre besoin. Pour une commande, indiquez son statut sans partager de code secret."
                />
              </label>
              <p className="m-form-note">
                <Icon name="lock" size="sm" /> N’indiquez ni PIN, ni code de remise, ni secret de
                wallet.
              </p>
              <button type="submit" className="m-button">
                Préparer mon e-mail
              </button>
            </form>
            {draft && (
              <div className="m-prepared-message" role="status">
                <Icon name="check-circle" />
                <h3>Votre message est prêt.</h3>
                <p>Ouvrez votre messagerie pour vérifier et envoyer l’e-mail à {CONTACT.email}.</p>
                <pre>{draft.body}</pre>
                <div className="m-actions">
                  <a
                    className="m-button"
                    href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
                  >
                    Ouvrir ma messagerie
                  </a>
                  <button type="button" className="m-button m-button-quiet" onClick={copyMessage}>
                    {copied ? "Message copié" : "Copier le message"}
                  </button>
                </div>
                {copyError && (
                  <p>
                    La copie automatique est indisponible. Vous pouvez sélectionner le texte
                    ci-dessus.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container">
          <SectionHeading
            eyebrow="Gagnez un peu de temps"
            title="Votre réponse est peut-être déjà ici."
          />
          <div className="m-scenario-grid">
            <Link to="/aide">
              <Icon name="info" size="lg" />
              <h3>Une question sur le service</h3>
              <p>Wallet, code, livraison, remboursement : parcourez le centre d’aide.</p>
              <span className="m-card-link">Consulter les réponses</span>
            </Link>
            <Link to="/fonctionnement">
              <Icon name="node" size="lg" />
              <h3>Découvrir le parcours</h3>
              <p>Comprenez ce qui se passe entre le lien de commande et la remise.</p>
              <span className="m-card-link">Explorer le fonctionnement</span>
            </Link>
            <Link to="/securite">
              <Icon name="shield" size="lg" />
              <h3>Comprendre la protection</h3>
              <p>Retrouvez les règles de paiement et les précautions à connaître.</p>
              <span className="m-card-link">Comprendre les paiements</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
