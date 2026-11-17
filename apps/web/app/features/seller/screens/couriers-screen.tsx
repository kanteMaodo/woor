import { Banner } from "../../../components/ui/banner";
import { Chip, type ChipProps } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import { PersonRow } from "../../../components/ui/person-row";
import type { Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";
import type { CourierLinkStatus, CourierLinkView } from "../../account/account-views";

const LINK_STATUS: Record<CourierLinkStatus, ChipProps> = {
  active: { tone: "locked", icon: "check", label: "Actif" },
  to_verify: { tone: "wait", icon: "clock", label: "En attente" },
  invited: { tone: "done", icon: "send", label: "Invité" },
};

interface CouriersScreenProps {
  profile: Profile;
  couriers: CourierLinkView[];
}

/** S7 : les livreurs de la vendeuse. Seuls eux peuvent ramasser ses colis. */
export function CouriersScreen({ profile, couriers }: CouriersScreenProps) {
  return (
    <AccountScreen
      profile={profile}
      title="Mes livreurs"
      subtitle="Seuls ces livreurs peuvent ramasser vos colis."
      actions={
        <button type="button" className="btn btn-primary" disabled title="Bientôt disponible">
          <Icon name="plus" />
          Inviter un livreur
        </button>
      }
    >
      <div className="split">
        <section className="panel split-main">
          <h2>
            <Icon name="users" /> {couriers.length} livreur{couriers.length > 1 ? "s" : ""}
          </h2>
          {couriers.length === 0 ? (
            <div className="empty-state">
              <Icon name="moto" size="lg" />
              <p>Aucun livreur pour l'instant.</p>
            </div>
          ) : (
            <div>
              {couriers.map((courier) => (
                <PersonRow
                  key={courier.id}
                  name={`${courier.displayName} · n° … ${courier.phoneLast2}`}
                  detail={courier.detail}
                  aside={<Chip {...LINK_STATUS[courier.status]} />}
                />
              ))}
            </div>
          )}
        </section>
        <aside className="split-side">
          <Banner tone="info" icon="shield">
            Votre livreur reçoit un code d'invitation à usage unique, valable 48 h. L'équipe Wóor
            vérifie son identité en personne avant sa première course.
          </Banner>
        </aside>
      </div>
    </AccountScreen>
  );
}
