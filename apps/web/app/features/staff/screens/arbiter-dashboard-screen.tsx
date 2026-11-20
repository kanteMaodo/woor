import { Link } from "react-router";

import { Icon } from "../../../components/ui/icon";
import { StatCard } from "../../../components/ui/stat-card";
import type { Profile } from "../../../lib/api/account-schemas";
import { formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";
import type { AlertView, NodeHealth } from "../staff-views";

interface ArbiterDashboardScreenProps {
  profile: Profile;
  health: NodeHealth;
  alerts: AlertView[];
}

/** A1 : l’argent en jeu, la santé du nœud, et ce qui demande une décision. */
export function ArbiterDashboardScreen({ profile, health, alerts }: ArbiterDashboardScreenProps) {
  const usage = Math.round((health.lockedXof / health.lockedCapXof) * 100);

  return (
    <AccountScreen
      profile={profile}
      title="Tableau de bord"
      subtitle="Tout ce qui est bloqué, et tout ce qui attend une décision."
      actions={
        <Link to="/arbitre/interrupteur" className="btn btn-secondary btn-danger">
          <Icon name="power" />
          Interrupteur général
        </Link>
      }
    >
      <section className="stat-grid" aria-label="Santé du service">
        <StatCard
          tone="primary"
          icon="lock"
          label="Bloqué en ce moment"
          value={formatXof(health.lockedXof)}
          hint={`${usage} % du plafond de ${formatXof(health.lockedCapXof)}`}
        />
        <StatCard
          icon="bolt"
          label="Paiements tenus"
          value={`${health.heldPayments} / ${health.maxPayments}`}
          hint="hold invoices ouvertes"
        />
        <StatCard
          icon="clock"
          label="Marge HTLC"
          value={`${health.htlcMarginBlocks} blocs`}
          hint="avant l’expiration la plus proche"
        />
        <StatCard
          icon="node"
          label="Nœud"
          value={health.nodeOnline ? "En ligne" : "Hors ligne"}
          hint={`Réconciliation ${health.reconciliation}`}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            <Icon name="alert" /> Alertes
          </h2>
        </div>
        {alerts.length === 0 ? (
          <div className="empty-state">
            <Icon name="check-circle" size="lg" />
            <p>Rien à trancher. Tout tourne.</p>
          </div>
        ) : (
          <ul className="list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  to={alert.kind === "dispute" ? `/arbitre/litiges/${alert.id}` : "/arbitre"}
                  className="item"
                >
                  <span className="top">
                    <span className="t">
                      <Icon name={alert.kind === "dispute" ? "lock" : "wallet"} size="sm" />{" "}
                      {alert.title}
                    </span>
                    <Icon name="chev" size="sm" />
                  </span>
                  <span className="s">{alert.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccountScreen>
  );
}
