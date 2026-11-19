import { Form } from "react-router";

import { Chip } from "../../../components/ui/chip";
import { ChoiceList } from "../../../components/ui/choice-list";
import { Icon } from "../../../components/ui/icon";
import type { Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";
import type { DisputeView } from "../staff-views";

const DECISIONS = [
  { value: "pay_both", label: "Payer les deux : colis remis" },
  { value: "refund_all", label: "Tout rendre à l’acheteur" },
  { value: "new_code", label: "Nouveau code, dicté au téléphone" },
];

interface DisputeScreenProps {
  profile: Profile;
  dispute: DisputeView;
}

/** A2 : l’arbitre lit la chronologie, appelle les parties, puis tranche avec sa passkey. */
export function DisputeScreen({ profile, dispute }: DisputeScreenProps) {
  return (
    <AccountScreen
      profile={profile}
      backTo="/arbitre"
      title={dispute.itemLabel}
      subtitle={
        <span className="chips">
          <Chip tone="danger" icon="lock" label={dispute.reasonLabel} />
          <Chip tone="wait" icon="clock" label={`Avant ${dispute.decideBefore}`} />
        </span>
      }
    >
      <div className="split">
        <div className="split-main">
          <section className="panel">
            <h2>Chronologie</h2>
            <ol className="timeline">
              {dispute.events.map((event) => (
                <li key={`${event.at}-${event.label}`}>
                  <time>{event.at}</time>
                  <span>{event.label}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel">
            <h2>
              <Icon name="phone" /> Appeler
            </h2>
            <div className="contact-buttons">
              {dispute.contacts.map((contact) => (
                <button key={contact.label} type="button" className="btn btn-secondary" disabled>
                  <Icon name="phone" />
                  {contact.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="split-side">
          <Form method="post" className="panel summary">
            <ChoiceList
              name="decision"
              legend="Décision"
              choices={DECISIONS}
              defaultValue="new_code"
            />
            <div className="field">
              <label htmlFor="justification">Justification</label>
              <textarea
                id="justification"
                name="justification"
                className="input"
                required
                placeholder="Acheteur joint, identité confirmée, code perdu."
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled title="Bientôt disponible">
              <Icon name="finger" />
              Décider avec ma passkey
            </button>
          </Form>
        </aside>
      </div>
    </AccountScreen>
  );
}
