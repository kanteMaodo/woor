import { Link, useNavigation } from "react-router";

import { ActionButton } from "../../../components/ui/action-button";
import { Banner } from "../../../components/ui/banner";
import { Chip } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import { ValidatedForm } from "../../../components/ui/validated-form";
import { DeliveryCodeFormSchema } from "../../../lib/form-validation";
import type { Delivery, Profile } from "../../../lib/api/account-schemas";
import { formatTime, formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";
import { COURIER_STATUS, deliveryStep } from "../deliveries";

interface DeliveryScreenProps {
  profile: Profile;
  delivery: Delivery;
  error: string | null;
}

/** Une course : ramasser (C3), saisir le code (C4), puis « Paiement confirmé » (C5). */
export function DeliveryScreen({ profile, delivery, error }: DeliveryScreenProps) {
  const step = deliveryStep(delivery);
  if (step === "paid") {
    return <PaidScreen profile={profile} delivery={delivery} />;
  }

  return (
    <AccountScreen
      profile={profile}
      backTo="/livreur"
      title={delivery.itemLabel}
      subtitle={<Chip {...COURIER_STATUS[delivery.state]} />}
      actions={
        step === "pickup" && (
          <ActionButton intent="pickup" pendingLabel="Confirmation…">
            <Icon name="box" />
            J'ai récupéré le colis
          </ActionButton>
        )
      }
    >
      {error && <Banner tone="danger">{error}</Banner>}

      <div className="split">
        <div className="split-main">
          {step === "pickup" && (
            <Banner tone="info">
              L'acheteur a payé : l'argent est bloqué. Récupérez le colis chez {delivery.sellerName}
              {delivery.pickupDeadline ? ` avant ${formatTime(delivery.pickupDeadline)}` : ""}.
            </Banner>
          )}
          {step === "handover" && <CodeForm delivery={delivery} />}
          {step === "closed" && (
            <Banner tone="info" icon="check">
              Cette course est terminée : {COURIER_STATUS[delivery.state].label.toLowerCase()}.
            </Banner>
          )}
        </div>

        <aside className="split-side">
          <section className="panel summary">
            <h2>Adresse</h2>
            <div className="person">
              <span className="avatar">
                <Icon name="pin" />
              </span>
              <div className="kv">
                <b>{delivery.neighborhood ?? "Adresse effacée"}</b>
                {delivery.landmark && <span className="small muted">{delivery.landmark}</span>}
              </div>
            </div>
          </section>
          <section className="panel summary">
            <h2>Course</h2>
            <div className="row">
              <span className="muted">Vendeuse</span>
              <span>{delivery.sellerName}</span>
            </div>
            <div className="row total">
              <span>Votre course</span>
              <span>{formatXof(delivery.deliveryFeeXof)}</span>
            </div>
          </section>
        </aside>
      </div>
    </AccountScreen>
  );
}

/** C4 : le code lu sur le téléphone de l'acheteur. */
function CodeForm({ delivery }: { delivery: Delivery }) {
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";

  if (delivery.codeLocked) {
    return (
      <Banner tone="danger">
        Trop de codes faux : la commande est verrouillée. Gardez le colis, un arbitre va trancher.
      </Banner>
    );
  }

  return (
    <section className="panel code-panel">
      <h2>Code de l'acheteur</h2>
      <p className="muted">
        Il le lit sur son téléphone. Ne remettez le colis qu'après validation.
      </p>
      <ValidatedForm method="post" schema={DeliveryCodeFormSchema} className="stack">
        <input type="hidden" name="intent" value="code" />
        <label htmlFor="code" className="sr-only">
          Code à 6 chiffres
        </label>
        <input
          id="code"
          name="code"
          className="input code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="••••••"
          required
        />
        <p className="center">
          <Chip
            tone="wait"
            icon="alert"
            label={`Il reste ${delivery.codeAttemptsLeft} essai${delivery.codeAttemptsLeft > 1 ? "s" : ""}`}
          />
        </p>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="check" />
          {pending ? "Vérification…" : "Valider le code"}
        </button>
      </ValidatedForm>
    </section>
  );
}

/** C5 : le code était juste, le paiement est débloqué. */
function PaidScreen({ profile, delivery }: { profile: Profile; delivery: Delivery }) {
  return (
    <AccountScreen profile={profile} backTo="/livreur" title="Paiement confirmé">
      <section className="panel paid-panel">
        <div className="bigicon ok">
          <Icon name="check" size="xl" />
        </div>
        <p className="paid-title">Jërëjëf ! Remettez le colis.</p>
        <div className="row">
          <span className="muted">Article</span>
          <span>{delivery.itemLabel}</span>
        </div>
        <div className="row total">
          <span>Votre course</span>
          <span>{formatXof(delivery.deliveryFeeXof)}</span>
        </div>
        <p className="note">Paiement débloqué pour la vendeuse et pour vous.</p>
        <Link to="/livreur" className="btn btn-primary">
          Retour à mes courses
        </Link>
      </section>
    </AccountScreen>
  );
}
