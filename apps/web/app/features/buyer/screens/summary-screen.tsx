import { Banner } from "../../../components/ui/banner";
import { Icon } from "../../../components/ui/icon";
import { Screen } from "../../../components/ui/screen";
import type { PublicOrderSummary } from "../../../lib/api/buyer-schemas";
import { IntentButton } from "../components/intent-button";
import { PriceLines } from "../components/price-lines";

interface SummaryScreenProps {
  summary: PublicOrderSummary;
  error: string | null;
}

/** B1 : l’acheteur vérifie la vendeuse et les montants avant de s’engager. */
export function SummaryScreen({ summary, error }: SummaryScreenProps) {
  return (
    <Screen
      context="Paiement protégé"
      footer={
        <>
          <IntentButton intent="claim" pendingLabel="Préparation du paiement…">
            Je commande
          </IntentButton>
          <p className="note">Remboursé automatiquement si rien n’arrive.</p>
        </>
      }
    >
      <div className="kv">
        <h1 className="h2">{summary.sellerName}</h1>
        <span className="pill">
          <Icon name="check-circle" size="sm" />
          {summary.sellerSuccessfulDeliveries}{" "}
          {summary.sellerSuccessfulDeliveries > 1 ? "livraisons réussies" : "livraison réussie"}
        </span>
      </div>

      <div className="card">
        <h2 className="h3">{summary.itemLabel}</h2>
        <PriceLines {...summary} />
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <h2 className="h3">Comment ça marche</h2>
      <ul className="how">
        <li>
          <span className="ic">
            <Icon name="lock" />
          </span>
          Vous bloquez l’argent dans votre wallet
        </li>
        <li>
          <span className="ic">
            <Icon name="moto" />
          </span>
          Le livreur vous apporte le colis
        </li>
        <li>
          <span className="ic">
            <Icon name="key" />
          </span>
          Votre code libère le paiement
        </li>
      </ul>
    </Screen>
  );
}
