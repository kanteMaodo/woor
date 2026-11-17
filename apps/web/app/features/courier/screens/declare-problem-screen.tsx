import { Form, useNavigation } from "react-router";

import { Banner } from "../../../components/ui/banner";
import { Checklist } from "../../../components/ui/checklist";
import { ChoiceList } from "../../../components/ui/choice-list";
import { Icon } from "../../../components/ui/icon";
import type { Delivery, Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";

export interface DoorstepFacts {
  arrivedAt: string;
  waitedEnough: boolean;
  calls: string[];
  locationAttached: boolean;
}

interface DeclareProblemScreenProps {
  profile: Profile;
  delivery: Delivery;
  facts: DoorstepFacts;
}

const PROBLEMS = [
  {
    value: "no_show",
    label: "L'acheteur est absent ou injoignable",
    hint: "15 min d'attente et 2 appels sont exigés",
  },
  { value: "refusal", label: "L'acheteur refuse le colis" },
];

/**
 * C6 : le livreur déclare une absence ou un refus. Les preuves sont réunies d'avance
 * (arrivée, appels, position approximative) : la déclaration ne se fait pas sur parole.
 */
export function DeclareProblemScreen({ profile, delivery, facts }: DeclareProblemScreenProps) {
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";
  const callsDone = facts.calls.length >= 2;

  return (
    <AccountScreen
      profile={profile}
      backTo={`/livreur/courses/${delivery.id}`}
      title="Un problème à la porte ?"
      subtitle={delivery.itemLabel}
    >
      <Form method="post" className="split">
        <input type="hidden" name="intent" value="declare" />
        <section className="panel split-main">
          <ChoiceList
            name="problem"
            legend="Que se passe-t-il ?"
            choices={PROBLEMS}
            defaultValue="no_show"
          />
        </section>
        <aside className="split-side">
          <section className="panel summary">
            <h2>
              <Icon name="shield" /> Preuves jointes
            </h2>
            <Checklist
              items={[
                {
                  done: facts.waitedEnough,
                  label: `Arrivé à ${facts.arrivedAt}, attente de 15 min ${facts.waitedEnough ? "faite" : "en cours"}`,
                },
                {
                  done: callsDone,
                  label: callsDone
                    ? `${facts.calls.length} appels sans réponse (${facts.calls.join(", ")})`
                    : "2 appels à l'acheteur exigés",
                },
                {
                  done: facts.locationAttached,
                  label: "Votre position approximative (environ 1 km) est jointe",
                },
              ]}
            />
          </section>
          <Banner tone="info" icon="clock">
            L'acheteur a 10 min pour contester. Sans contestation, votre course est payée et
            l'article revient à la vendeuse.
          </Banner>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Envoi…" : "Envoyer la déclaration"}
          </button>
        </aside>
      </Form>
    </AccountScreen>
  );
}
