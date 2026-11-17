import { Form, Link, useNavigation } from "react-router";

import { ActionButton } from "../../../components/ui/action-button";
import { Banner } from "../../../components/ui/banner";
import { Chip } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import type { Delivery, Profile } from "../../../lib/api/account-schemas";
import { formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";
import { COURIER_STATUS, type DeliveryStep, deliveryStep } from "../deliveries";

const CODE_FORM_ID = "delivery-code";

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
      footer={<DeliveryAction step={step} delivery={delivery} />}
    >
      <div className="row">
        <h1 className="h2">{delivery.itemLabel}</h1>
        <Chip {...COURIER_STATUS[delivery.state]} />
      </div>

      <div className="card">
        <div className="person">
          <span className="avatar">
            <Icon name="pin" />
          </span>
          <div className="kv">
            <b>{delivery.neighborhood ?? "Adresse effacée"}</b>
            {delivery.landmark && <span className="small muted">{delivery.landmark}</span>}
          </div>
        </div>
      </div>

      <div className="card small">
        <div className="row">
          <span className="muted">Vendeuse</span>
          <span>{delivery.sellerName}</span>
        </div>
        <div className="row">
          <span className="muted">Votre course</span>
          <span className="v">{formatXof(delivery.deliveryFeeXof)}</span>
        </div>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      {step === "pickup" && (
        <Banner tone="info">
          L'acheteur a payé : l'argent est bloqué. Récupérez le colis chez {delivery.sellerName}.
        </Banner>
      )}

      {step === "handover" && <CodeForm delivery={delivery} />}

      {step === "closed" && (
        <Banner tone="info" icon="check">
          Cette course est terminée : {COURIER_STATUS[delivery.state].label.toLowerCase()}.
        </Banner>
      )}
    </AccountScreen>
  );
}

function DeliveryAction({ step, delivery }: { step: DeliveryStep; delivery: Delivery }) {
  const navigation = useNavigation();
  if (step === "pickup") {
    return (
      <ActionButton intent="pickup" pendingLabel="Confirmation…">
        <Icon name="box" />
        J'ai récupéré le colis
      </ActionButton>
    );
  }
  if (step === "handover" && !delivery.codeLocked) {
    const pending = navigation.state === "submitting";
    return (
      <button type="submit" form={CODE_FORM_ID} className="btn btn-primary" disabled={pending}>
        {pending ? "Vérification…" : "Valider le code"}
      </button>
    );
  }
  return null;
}

/** C4 : le code lu sur le téléphone de l'acheteur. */
function CodeForm({ delivery }: { delivery: Delivery }) {
  if (delivery.codeLocked) {
    return (
      <Banner tone="danger">
        Trop de codes faux : la commande est verrouillée. Gardez le colis, un arbitre va trancher.
      </Banner>
    );
  }

  return (
    <>
      <Banner tone="warn" icon="alert">
        Ne remettez le colis qu'après l'écran vert « Paiement confirmé ».
      </Banner>
      <Form method="post" id={CODE_FORM_ID} className="stack">
        <input type="hidden" name="intent" value="code" />
        <div className="field">
          <label htmlFor="code">Code de l'acheteur, lu sur son téléphone</label>
          <input
            id="code"
            name="code"
            className="input code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
          />
        </div>
        <p className="center">
          <Chip
            tone="wait"
            icon="alert"
            label={`Il reste ${delivery.codeAttemptsLeft} essai${delivery.codeAttemptsLeft > 1 ? "s" : ""}`}
          />
        </p>
      </Form>
    </>
  );
}

/** C5 : le code était juste, le paiement est débloqué. */
function PaidScreen({ profile, delivery }: { profile: Profile; delivery: Delivery }) {
  return (
    <AccountScreen
      profile={profile}
      footer={
        <Link to="/livreur" className="btn btn-primary">
          Terminé
        </Link>
      }
    >
      <div className="bigicon ok">
        <Icon name="check" size="xl" />
      </div>
      <h1 className="h1 center">Paiement confirmé</h1>
      <p className="center">Remettez le colis.</p>
      <div className="card">
        <div className="row">
          <span className="muted">Votre course</span>
          <span className="v">{formatXof(delivery.deliveryFeeXof)}</span>
        </div>
        <div className="row">
          <span className="muted">Article</span>
          <span>{delivery.itemLabel}</span>
        </div>
      </div>
      <p className="note">La vendeuse est payée automatiquement.</p>
    </AccountScreen>
  );
}
