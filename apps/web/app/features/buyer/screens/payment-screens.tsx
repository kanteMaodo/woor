import { Amount } from "../../../components/ui/amount";
import { Banner } from "../../../components/ui/banner";
import { CopyButton } from "../../../components/ui/copy-button";
import { Icon } from "../../../components/ui/icon";
import { Screen } from "../../../components/ui/screen";
import type { BuyerInvoice, BuyerOrderView } from "../../../lib/api/buyer-schemas";
import { formatXof, minutesUntil } from "../../../lib/format";
import type { BuyerPageContext } from "../buyer-page-context";
import { IntentButton } from "../components/intent-button";

const CANCEL_CONFIRM = "Annuler la commande ? Rien ne vous sera prélevé.";

interface PaymentScreenProps {
  view: BuyerOrderView;
  step: 1 | 2;
  invoice: BuyerInvoice;
  context: BuyerPageContext;
}

/** B3 et B4 : une facture à la fois, la course d’abord, puis l’article. */
export function PaymentScreen({ view, step, invoice, context }: PaymentScreenProps) {
  const minutesLeft = minutesUntil(invoice.expiresAt, context.now);
  const qr = context.qr[invoice.kind];
  const fee = view.invoices.find((candidate) => candidate.kind === "delivery_fee");

  return (
    <Screen
      context={`Paiement ${step} sur 2`}
      footer={
        <>
          <a className="btn btn-primary" href={`lightning:${invoice.bolt11}`}>
            <Icon name="wallet" />
            Ouvrir mon wallet
          </a>
          <CopyButton value={invoice.bolt11} label="Copier la facture" />
          <IntentButton intent="cancel" className="btn btn-link muted" confirm={CANCEL_CONFIRM}>
            Annuler la commande
          </IntentButton>
        </>
      }
    >
      <div className="steps" aria-hidden="true">
        <span className="on" />
        <span className={step === 2 ? "on" : ""} />
      </div>

      {step === 2 && fee && (
        <Banner tone="info">
          <p>Livraison bloquée : {formatXof(fee.amountXof)}</p>
        </Banner>
      )}

      <h1 className="h2">{step === 1 ? "D’abord, la livraison" : "Maintenant, l’article"}</h1>
      <Amount xof={invoice.amountXof} sats={invoice.amountSats} />

      {qr && (
        <div
          className="qr"
          role="img"
          aria-label="QR code de la facture Lightning"
          // SVG fabriqué par notre serveur à partir de la facture : aucun contenu externe.
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      )}

      <Banner tone="warn">
        <p>
          {minutesLeft > 0
            ? `Il reste ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""} pour payer.`
            : "Le délai de paiement est dépassé."}
        </p>
      </Banner>
    </Screen>
  );
}

/** Le service de paiements prépare les deux factures : quelques secondes. */
export function PreparingScreen({ context }: { context: BuyerPageContext }) {
  return (
    <Screen
      context="Paiement protégé"
      footer={
        <IntentButton intent="invoices" className="btn btn-secondary">
          Réessayer
        </IntentButton>
      }
    >
      <div className="bigicon neutral">
        <Icon name="clock" size="xl" />
      </div>
      <h1 className="h1 center">Préparation de vos factures</h1>
      <p className="center muted">Cela prend quelques secondes. La page se met à jour seule.</p>
      {context.error && <Banner tone="danger">{context.error}</Banner>}
    </Screen>
  );
}

/** Les deux paiements sont reçus, la commande passe en « bloqué ». */
export function ConfirmingScreen() {
  return (
    <Screen context="Paiement protégé">
      <div className="bigicon ok">
        <Icon name="lock" size="xl" />
      </div>
      <h1 className="h1 center">Paiements reçus</h1>
      <p className="center muted">Confirmation du blocage en cours. La page se met à jour seule.</p>
    </Screen>
  );
}

/** Une facture a expiré avant d’être payée : rien n’est prélevé. */
export function PaymentExpiredScreen() {
  return (
    <Screen>
      <div className="bigicon neutral">
        <Icon name="clock" size="xl" />
      </div>
      <h1 className="h1 center">Délai de paiement dépassé</h1>
      <p className="center muted">
        Rien n’a été prélevé : un paiement déjà bloqué revient à votre wallet. Demandez un nouveau
        lien à la vendeuse.
      </p>
    </Screen>
  );
}
