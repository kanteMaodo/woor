import { Link } from "react-router";

import { Chip } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import { StatCard } from "../../../components/ui/stat-card";
import type { Profile, SellerOrder } from "../../../lib/api/account-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";
import {
  countByFilter,
  filterSellerOrders,
  SELLER_FILTERS,
  SELLER_STATUS,
  type SellerFilterKey,
  sellerKpis,
} from "../seller-orders";

interface SellerOrdersScreenProps {
  profile: Profile;
  orders: SellerOrder[];
  filter: SellerFilterKey;
}

/** S1 : tableau de bord de la vendeuse. Chiffres clés, puis ses commandes. */
export function SellerOrdersScreen({ profile, orders, filter }: SellerOrdersScreenProps) {
  const kpis = sellerKpis(orders);
  const counts = countByFilter(orders);
  const shown = filterSellerOrders(orders, filter);
  const firstName = profile.displayName.split(" ")[0];

  return (
    <AccountScreen
      profile={profile}
      title="Tableau de bord"
      subtitle={`Bonjour ${firstName}, voici où en sont vos ventes.`}
      actions={
        <Link to="/vendeuse/nouvelle" className="btn btn-primary">
          <Icon name="plus" />
          Nouvelle commande
        </Link>
      }
    >
      <section className="stat-grid" aria-label="Chiffres clés">
        <StatCard
          tone="primary"
          icon="lock"
          label="À recevoir"
          value={formatXof(kpis.pendingXof)}
          hint={`${kpis.pendingCount} commande${plural(kpis.pendingCount)} bloquée${plural(kpis.pendingCount)}`}
        />
        <StatCard
          tone="warn"
          icon="clock"
          label="Liens en attente"
          value={String(kpis.awaitingCount)}
          hint="pas encore payés"
        />
        <StatCard
          icon="check-circle"
          label="Commandes remises"
          value={String(kpis.deliveredCount)}
          hint="code validé à la porte"
        />
        <StatCard
          icon="coin"
          label="Encaissé"
          value={formatXof(kpis.earnedXof)}
          hint="prix des articles remis"
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Commandes</h2>
          <nav className="tabs" aria-label="Filtrer les commandes">
            {SELLER_FILTERS.map((candidate) => (
              <Link
                key={candidate.key}
                to={`?filtre=${candidate.key}`}
                aria-current={candidate.key === filter ? "page" : undefined}
              >
                {candidate.label}
                <span className="tab-count">{counts[candidate.key]}</span>
              </Link>
            ))}
          </nav>
        </div>

        {shown.length === 0 ? (
          <div className="empty-state">
            <Icon name="box" size="lg" />
            <p>Aucune commande ici pour l'instant.</p>
            <Link to="/vendeuse/nouvelle" className="btn-link">
              Créer une commande
            </Link>
          </div>
        ) : (
          <div className="data-table" role="table" aria-label="Commandes">
            <div className="dt-row dt-head" role="row">
              <span role="columnheader">Article</span>
              <span role="columnheader">Quartier</span>
              <span role="columnheader">Livreur</span>
              <span role="columnheader">Prix</span>
              <span role="columnheader">État</span>
              <span role="columnheader">Créée</span>
            </div>
            {shown.map((order) => (
              <Link
                key={order.id}
                to={`/vendeuse/commandes/${order.id}`}
                className="dt-row"
                role="row"
              >
                <span className="dt-main" role="cell">
                  {order.itemLabel}
                </span>
                <span className="dt-sub" role="cell">
                  <Icon name="pin" size="sm" />
                  {order.neighborhood ?? "Adresse effacée"}
                </span>
                <span className="dt-sub" role="cell">
                  {order.courierName}
                </span>
                <span className="dt-amount" role="cell">
                  {formatXof(order.itemPriceXof)}
                </span>
                <span className="dt-state" role="cell">
                  <Chip {...SELLER_STATUS[order.state]} />
                </span>
                <span className="dt-date" role="cell">
                  {formatTime(order.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AccountScreen>
  );
}

function plural(count: number): string {
  return count > 1 ? "s" : "";
}
