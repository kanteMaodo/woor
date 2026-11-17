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
      title={order.itemLabel}
      subtitle={<Chip {...SELLER_STATUS[order.state]} />}
      actions={
        cancellable && (
          <ActionButton
            intent="cancel"
            className="btn btn-secondary btn-danger"
            confirm="Annuler la commande ? L'acheteur sera remboursé en entier."
          >
            <Icon name="x" />
            Annuler la commande
          </ActionButton>
        )
      }
    >
      {error && <Banner tone="danger">{error}</Banner>}

      <section className="panel">
        <OrderProgress state={order.state} />
        {order.state === "locked" && (
          <Banner tone="info">
            L'acheteur a payé : l'argent est bloqué. Remettez le colis à {order.courierName}.
          </Banner>
        )}
      </section>

      <div className="split">
        <section className="panel split-main">
          <h2>Chronologie</h2>
          <ol className="timeline">
            {sellerTimeline(order).map((entry) => (
              <li key={`${entry.at}-${entry.label}`}>
                <time dateTime={entry.at}>{formatTime(entry.at)}</time>
                <span>{entry.label}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="split-side">
          <section className="panel summary">
            <h2>Montants</h2>
            <div className="row">
              <span className="muted">Article, pour vous</span>
              <span>{formatXof(order.itemPriceXof)}</span>
            </div>
            <div className="row">
              <span className="muted">Livraison, pour {order.courierName}</span>
              <span>{formatXof(order.deliveryFeeXof)}</span>
            </div>
            <div className="row total">
              <span>Payé par l'acheteur</span>
              <span>{formatXof(order.totalXof)}</span>
            </div>
          </section>
          {order.neighborhood && (
            <section className="panel summary">
              <h2>Livraison</h2>
              <p className="kv">
                <b>
                  <Icon name="pin" size="sm" /> {order.neighborhood}
                </b>
                {order.landmark && <span className="muted">{order.landmark}</span>}
              </p>
              <p className="muted">
                <Icon name="moto" size="sm" /> {order.courierName}
              </p>
            </section>
          )}
        </aside>
      </div>
    </AccountScreen>
  );
}
