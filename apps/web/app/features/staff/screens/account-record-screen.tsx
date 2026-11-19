import { Icon } from "../../../components/ui/icon";
import type { Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";
import type { AccountRecordView } from "../staff-views";

interface AccountRecordScreenProps {
  profile: Profile;
  record: AccountRecordView;
}

/** A4 : l’historique d’un compte, pour juger une absence déclarée ou un abus. */
export function AccountRecordScreen({ profile, record }: AccountRecordScreenProps) {
  return (
    <AccountScreen profile={profile} backTo="/arbitre" title="Fiche d’un compte">
      <section className="panel account-hero">
        <span className="initial big" aria-hidden="true">
          {record.displayName.charAt(0)}
        </span>
        <div className="kv">
          <b className="account-name">{record.displayName}</b>
          <span className="muted">
            {record.roleLabel} · n° … {record.phoneLast2}
            {record.verified ? " · identité vérifiée" : " · identité à vérifier"}
          </span>
        </div>
      </section>

      <div className="metrics">
        {record.metrics.map((metric) => (
          <div key={metric.label} className="metric">
            <span>{metric.label}</span>
            <b>{metric.value}</b>
          </div>
        ))}
      </div>

      <div className="split">
        <section className="panel split-main">
          <h2>Dernier avertissement</h2>
          <p className="muted">{record.lastStrike ?? "Aucun avertissement."}</p>
        </section>
        <aside className="split-side">
          <form className="panel summary">
            <div className="field">
              <label htmlFor="suspension">Motif de suspension</label>
              <textarea
                id="suspension"
                className="input"
                placeholder="Trois absences contestées en une semaine"
              />
            </div>
            <button type="button" className="btn btn-primary btn-danger-solid" disabled>
              <Icon name="alert" />
              Suspendre le compte
            </button>
            <button type="button" className="btn btn-secondary" disabled>
              Donner un avertissement
            </button>
          </form>
        </aside>
      </div>
    </AccountScreen>
  );
}
