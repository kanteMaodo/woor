import { Amount } from "../../../components/ui/amount";
import { Banner } from "../../../components/ui/banner";
import { Icon } from "../../../components/ui/icon";
import { Screen } from "../../../components/ui/screen";
import type { BuyerOrderView } from "../../../lib/api/buyer-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import type { BuyerPageContext } from "../buyer-page-context";
import { CourierCard } from "../components/courier-card";
import { DeliveryCode } from "../components/delivery-code";
import { IntentButton } from "../components/intent-button";
import { OrderProgress } from "../components/order-progress";

interface LockedScreenProps {
  view: BuyerOrderView;
  context: BuyerPageContext;
}

/** B5 et B6 : l'argent est bloqué, le code est prêt, le livreur va ramasser le colis. */
export function LockedScreen({ view, context }: LockedScreenProps) {
  return (
    <Screen
      context="Commande bloquée"
      footer={
        <IntentButton
          intent="cancel"
          className="btn btn-link muted"
          confirm="Annuler la commande ? Tout votre argent vous sera rendu."
        >
          Annuler la commande
        </IntentButton>
      }
    >
      <OrderProgress state={view.state} />

      <div className="trust">
        <span className="pill">
          <Icon name="lock" size="sm" />
          Votre argent est bloqué, pas encaissé.
        </span>
        <Amount xof={view.totalXof} />
        <p className="small">Il ne part chez la vendeuse que quand vous donnez votre code.</p>
      </div>

      {context.error && <Banner tone="danger">{context.error}</Banner>}

      <DeliveryCode
        orderToken={context.orderToken}
        codeIssued={view.codeIssued}
        revealedCode={context.revealedCode}
      />

      <CourierCard view={view} />
    </Screen>
  );
}

/** B7 : le colis est en route. Le livreur attend le code, colis en main. */
export function TrackingScreen({ view, context }: LockedScreenProps) {
  return (
    <Screen context="En route">
      <OrderProgress state={view.state} />

      {view.state === "disputed" && (
        <Banner tone="info">
          <p>
            <b>Un arbitre examine la commande.</b>
          </p>
          <p>Votre argent reste bloqué pendant l'examen. Réponse en 2 h au plus.</p>
        </Banner>
      )}

      {view.refusalDeclaredAt && (
        <Banner tone="danger">
          <p>
            <b>Le livreur indique que vous refusez le colis.</b>
          </p>
          <p>
            Si c'est vrai, vous payez seulement la livraison. L'article reste dans votre wallet.
          </p>
        </Banner>
      )}

      {view.arrivedAt && !view.refusalDeclaredAt && (
        <Banner tone="info" icon="moto">
          <p>
            <b>Votre livreur est arrivé</b> à {formatTime(view.arrivedAt)}.
          </p>
          <p>Vérifiez le colis, puis donnez votre code.</p>
        </Banner>
      )}

      <DeliveryCode
        orderToken={context.orderToken}
        codeIssued={view.codeIssued}
        revealedCode={context.revealedCode}
      />

      <CourierCard view={view} />

      <div className="card">
        <div className="row">
          <span>{view.itemLabel}</span>
          <span className="v">{formatXof(view.totalXof)}</span>
        </div>
        {view.hardStopAt && (
          <p className="small muted">
            Remboursé automatiquement si rien n'arrive avant {formatTime(view.hardStopAt)}.
          </p>
        )}
      </div>
    </Screen>
  );
}
