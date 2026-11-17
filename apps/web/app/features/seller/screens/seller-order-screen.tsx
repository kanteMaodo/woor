import { ActionButton } from "../../../components/ui/action-button";
import { Banner } from "../../../components/ui/banner";
import { Chip } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import type { Profile, SellerOrder } from "../../../lib/api/account-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";
import { OrderProgress } from "../../orders/order-progress";
import { SELLER_STATUS, sellerTimeline } from "../seller-orders";

interface SellerOrderScreenProps {
  profile: Profile;
  order: SellerOrder;
  error: string | null;
}

/** S5 : où en est la commande, et ce que chacun recevra. */
export function SellerOrderScreen({ profile, order, error }: SellerOrderScreenProps) {
  const cancellable = order.state === "awaiting_payment" || order.state === "locked";

  return (
    <AccountScreen
      profile={profile}
      backTo="/vendeuse"
      footer={
        cancellable && (
          <ActionButton
            intent="cancel"
            className="btn btn-link muted"
            confirm="Annuler la commande ? L'acheteur sera remboursé en entier."
          >
            Annuler la commande
          </ActionButton>
        )
      }
    >
      <div className="row">
        <h1 className="h2">{order.itemLabel}</h1>
        <Chip {...SELLER_STATUS[order.state]} />
      </div>

      <OrderProgress state={order.state} />
      {error && <Banner tone="danger">{error}</Banner>}

      <div className="card">
        <div className="row">
          <span className="muted">Article, pour vous</span>
          <span className="v">{formatXof(order.itemPriceXof)}</span>
        </div>
        <div className="row">
          <span className="muted">Livraison, pour {order.courierName}</span>
          <span className="v">{formatXof(order.deliveryFeeXof)}</span>
        </div>
        {order.neighborhood && (
          <p className="small muted">
            <Icon name="pin" size="sm" /> {order.neighborhood}
            {order.landmark ? `, ${order.landmark}` : ""}
          </p>
        )}
      </div>

      <h2 className="h3">Chronologie</h2>
      <ol className="timeline">
        {sellerTimeline(order).map((entry) => (
          <li key={`${entry.at}-${entry.label}`}>
            <time dateTime={entry.at}>{formatTime(entry.at)}</time>
            <span>{entry.label}</span>
          </li>
        ))}
      </ol>

      {order.state === "locked" && (
        <Banner tone="info">
          L'acheteur a payé : l'argent est bloqué. Remettez le colis à {order.courierName}.
        </Banner>
      )}
    </AccountScreen>
  );
}
