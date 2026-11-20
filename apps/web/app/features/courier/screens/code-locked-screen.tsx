import { Banner } from "../../../components/ui/banner";
import { Icon } from "../../../components/ui/icon";
import type { Delivery, Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";

interface CodeLockedScreenProps {
  profile: Profile;
  delivery: Delivery;
  disputeOpenedAt: string;
  decisionBefore: string;
}

/** C7 : cinq codes faux. Le colis reste au livreur, un arbitre tranche sur preuves. */
export function CodeLockedScreen({
  profile,
  delivery,
  disputeOpenedAt,
  decisionBefore,
}: CodeLockedScreenProps) {
  return (
    <AccountScreen
      profile={profile}
      backTo="/livreur"
      title="Commande verrouillée"
      subtitle={delivery.itemLabel}
    >
      <div className="split">
        <div className="split-main">
          <section className="panel locked-panel">
            <div className="bigicon danger">
              <Icon name="lock" size="xl" />
            </div>
            <Banner tone="danger" icon="alert">
              5 codes faux : plus aucun code n’est accepté pour cette commande. Gardez le colis. Un
              arbitre Wóor vous appelle et décide sur preuves.
            </Banner>
          </section>
        </div>
        <aside className="split-side">
          <section className="panel summary">
            <div className="row">
              <span className="muted">Litige ouvert</span>
              <span className="v">{disputeOpenedAt}</span>
            </div>
            <div className="row">
              <span className="muted">Décision au plus tard</span>
              <span className="v">{decisionBefore}</span>
            </div>
            <div className="row">
              <span className="muted">Argent</span>
              <span>gelé, rien n’est perdu</span>
            </div>
          </section>
          <button type="button" className="btn btn-secondary" disabled title="Bientôt disponible">
            <Icon name="camera" />
            Ajouter une photo
          </button>
        </aside>
      </div>
    </AccountScreen>
  );
}
