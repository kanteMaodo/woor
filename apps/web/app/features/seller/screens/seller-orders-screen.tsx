import { Link } from "react-router";

import { Chip } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import type { Profile, SellerOrder } from "../../../lib/api/account-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";
import {
  filterSellerOrders,
  pendingForSeller,
  SELLER_FILTERS,
  SELLER_STATUS,
  type SellerFilterKey,
} from "../seller-orders";

interface SellerOrdersScreenProps {
  profile: Profile;
  orders: SellerOrder[];
  filter: SellerFilterKey;
}

/** S1 : les commandes de la vendeuse, et l'argent qui l'attend. */
export function SellerOrdersScreen({ profile, orders, filter }: SellerOrdersScreenProps) {
  const pending = pendingForSeller(orders);
  const shown = filterSellerOrders(orders, filter);

  return (
    <AccountScreen
      displayName={profile.displayName}
      footer={
        <Link to="/vendeuse/nouvelle" className="btn btn-primary">
          <Icon name="plus" />
          Nouvelle commande
        </Link>
      }
    >
      <div className="trust">
        <p className="small">À recevoir pour les commandes en cours</p>
        <div className="amount">{formatXof(pending.totalXof)}</div>
        <p className="small">
          {pending.count} commande{pending.count > 1 ? "s" : ""} bloquée
          {pending.count > 1 ? "s" : ""} chez les acheteurs
        </p>
      </div>

      <nav className="filters" aria-label="Filtrer les commandes">
        {SELLER_FILTERS.map((candidate) => (
          <Link
            key={candidate.key}
            to={`?filtre=${candidate.key}`}
            aria-current={candidate.key === filter ? "page" : undefined}
          >
            {candidate.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="empty">Aucune commande ici pour l'instant.</p>
      ) : (
        <ul className="list">
          {shown.map((order) => (
            <li key={order.id}>
              <Link to={`/vendeuse/commandes/${order.id}`} className="item">
                <span className="top">
                  <span className="t">{order.itemLabel}</span>
                  <Chip {...SELLER_STATUS[order.state]} />
                </span>
                <span className="top">
                  <span className="s">
                    <Icon name="pin" size="sm" />
                    {order.neighborhood ?? "Adresse effacée"}
                  </span>
                  <span>{formatXof(order.itemPriceXof)}</span>
                </span>
                <span className="s">{orderHint(order)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountScreen>
  );
}

function orderHint(order: SellerOrder): string {
  if (order.pickedUpAt && order.state === "in_transit") {
    return `${order.courierName} · ramassé à ${formatTime(order.pickedUpAt)}`;
  }
  if (order.state === "locked") {
    return `Prêt pour ${order.courierName}`;
  }
  if (order.state === "awaiting_payment") {
    return `Lien créé à ${formatTime(order.createdAt)}`;
  }
  return order.courierName;
}
