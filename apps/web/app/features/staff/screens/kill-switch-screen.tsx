import { Checklist } from "../../../components/ui/checklist";
import { Icon } from "../../../components/ui/icon";
import type { Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";
import type { KillSwitchView } from "../staff-views";

interface KillSwitchScreenProps {
  profile: Profile;
  killSwitch: KillSwitchView;
}

/**
 * A3 : l'interrupteur général. Un seul arbitre peut tout arrêter ; il en faut deux
 * pour tout relancer. Les commandes en cours vont jusqu'au bout.
 */
export function KillSwitchScreen({ profile, killSwitch }: KillSwitchScreenProps) {
  return (
    <AccountScreen
      profile={profile}
      title="Interrupteur général"
      subtitle="Arrêter les nouvelles commandes en cas d'anomalie."
    >
      <div className="alert-block" role="alert">
        <Icon name="power" />
        <div>
          <b>
            Interrupteur activé à {killSwitch.engagedAt} par {killSwitch.engagedBy}.
          </b>
          <p>Motif : {killSwitch.reason}.</p>
          <p>
            Plus aucune nouvelle commande ni nouveau blocage. Les commandes en cours continuent
            jusqu'au bout.
          </p>
        </div>
      </div>

      <section className="panel">
        <h2>
          <Icon name="users" /> Réactivation à deux arbitres
        </h2>
        <Checklist
          items={[
            {
              done: killSwitch.releaseRequestedBy !== null,
              label: killSwitch.releaseRequestedBy
                ? `Demande : ${killSwitch.releaseRequestedBy}, ${killSwitch.releaseRequestedAt ?? ""}`
                : "Demande de réactivation",
            },
            { done: false, label: "Validation : un second arbitre" },
          ]}
        />
        {killSwitch.requestedByMe && (
          <p className="small muted">Vous ne pouvez pas valider votre propre demande.</p>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={killSwitch.requestedByMe}
          title={killSwitch.requestedByMe ? "Un autre arbitre doit valider" : undefined}
        >
          <Icon name="finger" />
          Valider la réactivation
        </button>
      </section>
    </AccountScreen>
  );
}
