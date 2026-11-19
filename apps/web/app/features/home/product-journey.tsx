import { useState } from "react";

import { Icon } from "../../components/ui/icon";

const STAGES = [
  {
    title: "La commande est partagée",
    text: "Le vendeur crée le lien et l’envoie dans sa conversation avec l’acheteur.",
    status: "En attente de paiement",
    icon: "send" as const,
    caption: "Le lien est prêt à être envoyé.",
    amount: "13 500 F",
    label: "Total de la commande",
    detail: "L’acheteur retrouve le détail avant de payer.",
  },
  {
    title: "Le paiement est protégé",
    text: "L’acheteur bloque le prix de l’article et celui de la course avec son wallet Lightning.",
    status: "Paiement bloqué",
    icon: "lock" as const,
    caption: "Le livreur peut prendre la route.",
    amount: "13 500 F",
    label: "Bloqués jusqu’à la remise",
    detail: "Le vendeur voit le statut. L’acheteur garde son code.",
  },
  {
    title: "Le colis est remis",
    text: "L’acheteur donne son code à six chiffres. Le livreur le saisit et le paiement est libéré.",
    status: "Livraison confirmée",
    icon: "check-circle" as const,
    caption: "Chacun reçoit la part qui lui revient.",
    amount: "12 000 F + 1 500 F",
    label: "Article et course réglés séparément",
    detail: "Une remise confirmée, une commande terminée.",
  },
] as const;

export function ProductJourney() {
  const [stage, setStage] = useState(1);
  const current = STAGES[stage] ?? STAGES[0];
  return (
    <div className="m-journey">
      <div className="m-journey-steps" role="tablist" aria-label="Les étapes d’une commande">
        {STAGES.map((item, index) => (
          <button
            type="button"
            role="tab"
            id={`journey-tab-${index}`}
            aria-selected={stage === index}
            aria-controls="journey-panel"
            tabIndex={stage === index ? 0 : -1}
            onClick={() => setStage(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowDown" || event.key === "ArrowRight"
                  ? (index + 1) % STAGES.length
                  : event.key === "ArrowUp" || event.key === "ArrowLeft"
                    ? (index + STAGES.length - 1) % STAGES.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? STAGES.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setStage(next);
                document.getElementById(`journey-tab-${next}`)?.focus();
              }
            }}
            key={item.title}
          >
            <span className="m-step-icon">
              <Icon name={item.icon} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </span>
          </button>
        ))}
      </div>
      <div
        className="m-product-window"
        role="tabpanel"
        id="journey-panel"
        aria-labelledby={`journey-tab-${stage}`}
        tabIndex={0}
      >
        <div className="m-window-bar">
          <span className="m-window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>
            <Icon name="lock" size="sm" /> Commande Wóor
          </span>
          <span className="m-demo-label">Exemple illustratif</span>
        </div>
        <div className="m-product-body">
          <div className="m-order-top">
            <span className="m-shop-avatar">AC</span>
            <div>
              <strong>Awa Couture</strong>
              <span>Votre commande · Dakar</span>
            </div>
            <Icon name="shield" />
          </div>
          <div className="m-product-item">
            <span className="m-fabric-swatch" />
            <div>
              <strong>Robe en wax, taille M</strong>
              <span>Article · 12 000 F CFA</span>
            </div>
            <span>× 1</span>
          </div>
          <div className="m-product-payment" aria-live="polite">
            <span className="m-product-status">
              <Icon name={current.icon} size="sm" />
              {current.status}
            </span>
            <span>{current.label}</span>
            <strong>{current.amount}</strong>
            <p>{current.detail}</p>
          </div>
          <div className="m-product-bottom">
            <Icon name={current.icon} />
            <span>{current.caption}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
