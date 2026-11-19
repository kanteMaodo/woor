import { Banner } from "../../../components/ui/banner";
import type { Profile, SellerOrder } from "../../../lib/api/account-schemas";
import { formatTime } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";

interface PickupQrScreenProps {
  profile: Profile;
  order: SellerOrder;
  /** QR signé par l’API, fabriqué en SVG par le serveur web. */
  qrSvg: string;
  validUntil: string;
}

/** S4 : la vendeuse montre ce QR au livreur ; le scan prouve que le colis a changé de mains. */
export function PickupQrScreen({ profile, order, qrSvg, validUntil }: PickupQrScreenProps) {
  return (
    <AccountScreen
      profile={profile}
      backTo={`/vendeuse/commandes/${order.id}`}
      title={`Montrez ce code à ${order.courierName.split(" ")[0]}`}
      subtitle={`${order.itemLabel}${order.neighborhood ? ` · ${order.neighborhood}` : ""}`}
    >
      <div className="split">
        <section className="panel split-main">
          <div className="qr-large" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </section>
        <aside className="split-side">
          <section className="panel summary">
            <div className="row">
              <span className="muted">Valable jusqu’à</span>
              <span className="v">{formatTime(validUntil)}</span>
            </div>
            <div className="row">
              <span className="muted">Seul peut le scanner</span>
              <span>{order.courierName}</span>
            </div>
          </section>
          <Banner tone="info" icon="info">
            Montez la luminosité au maximum pour que le scan soit rapide.
          </Banner>
        </aside>
      </div>
    </AccountScreen>
  );
}
