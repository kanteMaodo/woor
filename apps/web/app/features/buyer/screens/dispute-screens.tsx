import { Link, useNavigation } from "react-router";

import { Banner } from "../../../components/ui/banner";
import { ChoiceList } from "../../../components/ui/choice-list";
import { Icon } from "../../../components/ui/icon";
import { Screen } from "../../../components/ui/screen";
import { ValidatedForm } from "../../../components/ui/validated-form";
import { BuyerReportFormSchema } from "../../../lib/form-validation";
import type { BuyerOrderView } from "../../../lib/api/buyer-schemas";
import { formatTime, formatXof, minutesUntil } from "../../../lib/format";
import { OrderProgress } from "../../orders/order-progress";
import type { BuyerPageContext } from "../buyer-page-context";
import { IntentButton } from "../components/intent-button";

interface DisputeScreenProps {
  view: BuyerOrderView;
  context: BuyerPageContext;
}

/** B8 : le livreur dit que l’acheteur refuse le colis. L’acheteur confirme ou conteste. */
export function RefusalDeclaredScreen({ view, context }: DisputeScreenProps) {
  const minutesLeft = view.contestDeadline ? minutesUntil(view.contestDeadline, context.now) : 0;

  return (
    <Screen
      context="Refus déclaré"
      footer={
        <>
          <IntentButton intent="contest" pendingLabel="Envoi…">
            Ce n’est pas vrai, je conteste
          </IntentButton>
          <IntentButton
            intent="confirm-refusal"
            className="btn btn-secondary"
            confirm="Confirmer le refus ? Vous payez la livraison, l’article vous est rendu."
          >
            Je confirme mon refus
          </IntentButton>
        </>
      }
    >
      <OrderProgress state={view.state} />
      {context.error && <Banner tone="danger">{context.error}</Banner>}
      <Banner tone="warn" icon="alert">
        Le livreur indique que vous refusez le colis. Si c’est vrai, vous payez seulement la
        livraison ({formatXof(view.deliveryFeeXof)}). L’article ({formatXof(view.itemPriceXof)})
        reste dans votre wallet.
      </Banner>
      <Banner tone="info" icon="clock">
        Sans réponse dans {minutesLeft} minute{minutesLeft > 1 ? "s" : ""}, le refus est confirmé.
      </Banner>
      <div className="card small">
        {view.refusalDeclaredAt && (
          <div className="row">
            <span className="muted">Déclaré à</span>
            <span className="v">{formatTime(view.refusalDeclaredAt)}</span>
          </div>
        )}
        {view.courierFirstName && (
          <div className="row">
            <span className="muted">Livreur</span>
            <span>
              {view.courierFirstName}
              {view.courierPhoneLast2 ? ` · n° … ${view.courierPhoneLast2}` : ""}
            </span>
          </div>
        )}
      </div>
    </Screen>
  );
}

const REPORT_REASONS = [
  { value: "not_as_described", label: "L’article ne correspond pas à l’annonce" },
  { value: "courier_no_show", label: "Le livreur n’est pas venu" },
  { value: "code_lost", label: "J’ai perdu mon code" },
  { value: "other", label: "Autre chose" },
];

/** B9 : l’acheteur signale un problème. L’argent reste bloqué pendant l’examen. */
export function ReportProblemScreen({ context }: DisputeScreenProps) {
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";

  return (
    <Screen
      context="Signaler un problème"
      footer={
        <button type="submit" form="report" className="btn btn-primary" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer"}
        </button>
      }
    >
      <Link to="?" className="back-link">
        <Icon name="arrow-left" size="sm" /> Retour à ma commande
      </Link>
      {context.error && <Banner tone="danger">{context.error}</Banner>}
      <ValidatedForm method="post" schema={BuyerReportFormSchema} id="report" className="stack">
        <input type="hidden" name="intent" value="report" />
        <ChoiceList name="reason" legend="Que se passe-t-il ?" choices={REPORT_REASONS} />
        <div className="field">
          <label htmlFor="description">En une phrase</label>
          <textarea
            id="description"
            name="description"
            className="input"
            maxLength={300}
            placeholder="La robe est en taille S, pas M."
          />
        </div>
      </ValidatedForm>
      <Banner tone="info" icon="lock">
        Votre argent reste bloqué pendant l’examen. Réponse en 2 h au plus.
      </Banner>
    </Screen>
  );
}
