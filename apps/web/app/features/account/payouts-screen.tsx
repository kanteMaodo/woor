import { Banner } from "../../components/ui/banner";
import { Chip, type ChipProps } from "../../components/ui/chip";
import { Icon } from "../../components/ui/icon";
import { StatCard } from "../../components/ui/stat-card";
import type { Profile } from "../../lib/api/account-schemas";
import { formatTime, formatXof } from "../../lib/format";
import { AccountScreen } from "./account-screen";
import type { PayoutAddressView, PayoutStatus, PayoutView } from "./account-views";

const PAYOUT_STATUS: Record<PayoutStatus, ChipProps> = {
  received: { tone: "done", icon: "check", label: "Reçu" },
  upcoming: { tone: "wait", icon: "clock", label: "À venir" },
  failed: { tone: "danger", icon: "alert", label: "En attente d'adresse" },
};

interface PayoutsScreenProps {
  profile: Profile;
  payouts: PayoutView[];
  address: PayoutAddressView;
}

/**
 * S6 et C8 : où arrive l'argent, et ce qui est déjà arrivé.
 * Un changement d'adresse ne prend effet qu'après 24 h : un voleur de téléphone
 * ne peut pas détourner les versements d'un coup.
 */
export function PayoutsScreen({ profile, payouts, address }: PayoutsScreenProps) {
  const received = payouts.filter((payout) => payout.status === "received");
  const upcoming = payouts.filter((payout) => payout.status === "upcoming");
  const total = (list: PayoutView[]) => list.reduce((sum, payout) => sum + payout.amountXof, 0);

  return (
    <AccountScreen
      profile={profile}
      title="Versements"
      subtitle="Votre argent arrive directement dans votre wallet Lightning."
    >
      <section className="stat-grid" aria-label="Résumé des versements">
        <StatCard
          tone="primary"
          icon="wallet"
          label="Reçu"
          value={formatXof(total(received))}
          hint={`${received.length} versement${received.length > 1 ? "s" : ""}`}
        />
        <StatCard
          tone="warn"
          icon="clock"
          label="À venir"
          value={formatXof(total(upcoming))}
          hint="versé après la remise"
        />
      </section>

      <div className="split">
        <section className="panel split-main">
          <h2>Historique</h2>
          {payouts.length === 0 ? (
            <div className="empty-state">
              <Icon name="coin" size="lg" />
              <p>Aucun versement pour l'instant.</p>
            </div>
          ) : (
            <div className="data-table payouts" role="table" aria-label="Versements">
              {payouts.map((payout) => (
                <div key={payout.id} className="dt-row" role="row">
                  <span className="dt-main" role="cell">
                    {payout.label}
                  </span>
                  <span className="dt-sub" role="cell">
                    {payout.when}
                  </span>
                  <span className="dt-amount" role="cell">
                    {formatXof(payout.amountXof)}
                  </span>
                  <span className="dt-state" role="cell">
                    <Chip {...PAYOUT_STATUS[payout.status]} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="split-side">
          <PayoutAddressPanel address={address} />
        </aside>
      </div>
    </AccountScreen>
  );
}

function PayoutAddressPanel({ address }: { address: PayoutAddressView }) {
  return (
    <section className="panel summary">
      <h2>
        <Icon name="wallet" /> Adresse de versement
      </h2>
      <div className="field">
        <label htmlFor="payout-address">Adresse Lightning</label>
        <input
          id="payout-address"
          className="input"
          defaultValue={address.current ?? ""}
          placeholder="vous@wallet.example"
          readOnly
        />
      </div>
      {address.testedAt && (
        <p className="small">
          <Icon name="check-circle" size="sm" /> Adresse testée : 1 sat reçu à{" "}
          {formatTime(address.testedAt)}
        </p>
      )}
      {address.pendingChange && (
        <div className="card small">
          <p className="muted">Changement demandé</p>
          <b>{address.pendingChange.address}</b>
          <p className="muted">
            Effectif à {formatTime(address.pendingChange.effectiveAt)}, 24 h après la demande.
          </p>
        </div>
      )}
      <Banner tone="info" icon="shield">
        Un changement d'adresse prend effet 24 h après la demande. Vous recevez une alerte à chaque
        demande.
      </Banner>
      <button type="button" className="btn btn-secondary" disabled title="Bientôt disponible">
        <Icon name="finger" />
        Changer d'adresse
      </button>
    </section>
  );
}
