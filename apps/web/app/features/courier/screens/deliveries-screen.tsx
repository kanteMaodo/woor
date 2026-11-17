import { Link } from "react-router";

import { Chip } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import type { Delivery, Profile } from "../../../lib/api/account-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";
import { activeDeliveries, COURIER_STATUS, isActiveDelivery } from "../deliveries";

interface DeliveriesScreenProps {
  profile: Profile;
  deliveries: Delivery[];
}

/** C1 : les courses du livreur, celles à faire d'abord. */
export function DeliveriesScreen({ profile, deliveries }: DeliveriesScreenProps) {
  const active = activeDeliveries(deliveries);

  return (
    <AccountScreen profile={profile}>
      <div className="trust">
        <p className="small">Courses en cours</p>
        <div className="amount">{formatXof(active.totalXof)}</div>
        <p className="small">
          {active.count} course{active.count > 1 ? "s" : ""} à livrer
        </p>
      </div>

      {deliveries.length === 0 ? (
        <p className="empty">
          Aucune course pour l'instant. Elles apparaissent dès que l'acheteur a payé.
        </p>
      ) : (
        <ul className="list">
          {deliveries.map((delivery) => (
            <li key={delivery.id}>
              <Link
                to={`/livreur/courses/${delivery.id}`}
                className={`item${isActiveDelivery(delivery) ? "" : " faded"}`}
              >
                <span className="top">
                  <span className="t">{delivery.itemLabel}</span>
                  <Chip {...COURIER_STATUS[delivery.state]} />
                </span>
                <span className="s">
                  <Icon name="pin" size="sm" />
                  {delivery.sellerName} → {delivery.neighborhood ?? "adresse effacée"}
                </span>
                <span className="top">
                  <span className="s">{deliveryHint(delivery)}</span>
                  <span>{formatXof(delivery.deliveryFeeXof)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountScreen>
  );
}

function deliveryHint(delivery: Delivery): string {
  if (delivery.state === "locked" && delivery.pickupDeadline) {
    return `Bloqué · à ramasser avant ${formatTime(delivery.pickupDeadline)}`;
  }
  if (delivery.pickedUpAt && delivery.state === "in_transit") {
    return `Ramassé à ${formatTime(delivery.pickedUpAt)}`;
  }
  if (delivery.deliveredAt) {
    return `Remis à ${formatTime(delivery.deliveredAt)}`;
  }
  return "";
}
