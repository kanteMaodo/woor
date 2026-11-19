import { Link } from "react-router";

import { Chip } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import { StatCard } from "../../../components/ui/stat-card";
import type { Delivery, Profile } from "../../../lib/api/account-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import { CourierScene, EmptyParcelScene } from "../../../components/illustrations/scenes";
import { AccountScreen } from "../../account/account-screen";
import { WelcomeBanner } from "../../account/welcome-banner";
import { COURIER_STATUS, courierKpis, isActiveDelivery } from "../deliveries";

interface DeliveriesScreenProps {
  profile: Profile;
  deliveries: Delivery[];
}

/** C1 : tableau de bord du livreur. Ce qui reste à faire, ce qui est gagné. */
export function DeliveriesScreen({ profile, deliveries }: DeliveriesScreenProps) {
  const kpis = courierKpis(deliveries);
  const firstName = profile.displayName.split(" ")[0];

  return (
    <AccountScreen
      profile={profile}
      title="Mes courses"
      banner={
        <WelcomeBanner
          eyebrow="Espace livreur"
          title={
            <>
              Bonjour {firstName}, <em>vos courses</em> du jour.
            </>
          }
          description="Une course apparaît ici dès que l’acheteur a payé. Vous partez en sachant que l’argent est là, et le code confirme la remise."
          illustration={<CourierScene />}
        />
      }
    >
      <section className="stat-grid" aria-label="Chiffres clés">
        <StatCard
          tone="warn"
          icon="box"
          label="À ramasser"
          value={String(kpis.toPickUp)}
          hint="argent déjà bloqué"
        />
        <StatCard
          icon="moto"
          label="En route"
          value={String(kpis.onTheWay)}
          hint="code à saisir à la porte"
        />
        <StatCard
          tone="primary"
          icon="lock"
          label="Courses en cours"
          value={formatXof(kpis.pendingXof)}
          hint="payées à la remise"
        />
        <StatCard
          icon="coin"
          label="Gagné"
          value={formatXof(kpis.earnedXof)}
          hint={`${kpis.earnedCount} course${kpis.earnedCount > 1 ? "s" : ""} payée${kpis.earnedCount > 1 ? "s" : ""}`}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Courses</h2>
        </div>

        {deliveries.length === 0 ? (
          <div className="empty-state">
            <EmptyParcelScene className="empty-art" />
            <p>Aucune course pour l’instant.</p>
          </div>
        ) : (
          <div className="data-table courier" role="table" aria-label="Courses">
            <div className="dt-row dt-head" role="row">
              <span role="columnheader">Colis</span>
              <span role="columnheader">Trajet</span>
              <span role="columnheader">Course</span>
              <span role="columnheader">État</span>
              <span role="columnheader">Heure</span>
            </div>
            {deliveries.map((delivery) => (
              <Link
                key={delivery.id}
                to={`/livreur/courses/${delivery.id}`}
                className={`dt-row${isActiveDelivery(delivery) ? "" : " faded"}`}
                role="row"
              >
                <span className="dt-main" role="cell">
                  {delivery.itemLabel}
                </span>
                <span className="dt-sub" role="cell">
                  <Icon name="pin" size="sm" />
                  {delivery.sellerName} → {delivery.neighborhood ?? "adresse effacée"}
                </span>
                <span className="dt-amount" role="cell">
                  {formatXof(delivery.deliveryFeeXof)}
                </span>
                <span className="dt-state" role="cell">
                  <Chip {...COURIER_STATUS[delivery.state]} />
                </span>
                <span className="dt-date" role="cell">
                  {deliveryTime(delivery)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AccountScreen>
  );
}

function deliveryTime(delivery: Delivery): string {
  if (delivery.state === "locked" && delivery.pickupDeadline) {
    return `avant ${formatTime(delivery.pickupDeadline)}`;
  }
  const at = delivery.deliveredAt ?? delivery.pickedUpAt ?? delivery.lockedAt;
  return at ? formatTime(at) : "";
}
