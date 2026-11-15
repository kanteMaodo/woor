import type { OrderState } from "@woor/core";

import { Amount } from "../../../components/ui/amount";
import { Icon } from "../../../components/ui/icon";
import { Screen } from "../../../components/ui/screen";
import type { BuyerOrderView } from "../../../lib/api/buyer-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import { OrderProgress } from "../components/order-progress";
import { PriceLines } from "../components/price-lines";

/** B10 : le code a été donné, la vente est conclue. */
export function DeliveredScreen({ view }: { view: BuyerOrderView }) {
  return (
    <Screen context="Terminé">
      <div className="bigicon ok">
        <Icon name="check" size="xl" />
      </div>
      <h1 className="h1 center">Commande remise</h1>
      <OrderProgress state={view.state} />
      <div className="card">
        <PriceLines {...view} totalLabel="Payé" />
        {view.deliveredAt && <p className="small muted">Remis à {formatTime(view.deliveredAt)}</p>}
      </div>
    </Screen>
  );
}

type ClosedState = Extract<OrderState, "refunded" | "expired" | "courier_paid">;

const CLOSED_TEXT: Record<ClosedState, { title: string; detail: string }> = {
  refunded: {
    title: "Commande remboursée",
    detail: "Commande remboursée automatiquement, sans frais.",
  },
  expired: {
    title: "Commande expirée",
    detail: "Le paiement n'a pas été terminé à temps. Rien n'a été prélevé.",
  },
  courier_paid: {
    title: "Livraison payée, article rendu",
    detail:
      "Vous avez payé la course du livreur. Le prix de l'article est resté dans votre wallet.",
  },
};

function isClosedState(state: OrderState): state is ClosedState {
  return state in CLOSED_TEXT;
}

/** B11 : remboursement, expiration, ou refus à la porte. */
export function ClosedScreen({ view }: { view: BuyerOrderView }) {
  const text = isClosedState(view.state) ? CLOSED_TEXT[view.state] : CLOSED_TEXT.refunded;
  const courierPaid = view.state === "courier_paid";
  const returnedXof = courierPaid ? view.itemPriceXof : view.totalXof;
  const showReturned = view.state !== "expired";

  return (
    <Screen context="Terminé">
      <div className="bigicon neutral">
        <Icon name="undo" size="xl" />
      </div>
      <h1 className="h1 center">{text.title}</h1>
      <p className="center">{text.detail}</p>

      {showReturned && (
        <div className="trust">
          <Amount xof={returnedXof} />
          <p className="small">
            rendus à votre wallet{view.closedAt ? ` à ${formatTime(view.closedAt)}` : ""}
          </p>
        </div>
      )}

      <div className="card small">
        <div className="row">
          <span className="muted">Commande</span>
          <span>{view.itemLabel}</span>
        </div>
        {courierPaid && (
          <div className="row">
            <span className="muted">Livraison payée</span>
            <span className="v">{formatXof(view.deliveryFeeXof)}</span>
          </div>
        )}
      </div>

      {!courierPaid && (
        <p className="small muted center">
          L'argent n'a jamais quitté votre wallet : le paiement bloqué a été annulé.
        </p>
      )}
    </Screen>
  );
}
