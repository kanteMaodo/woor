import { ORDER_LIMITS } from "@woor/core";
import { useState } from "react";
import { Form, useNavigation } from "react-router";

import { Banner } from "../../../components/ui/banner";
import type { LinkedCourier, Profile } from "../../../lib/api/account-schemas";
import { formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";

const FORM_ID = "new-order";

interface NewOrderScreenProps {
  profile: Profile;
  couriers: LinkedCourier[];
  error: string | null;
}

/** S2 : la vendeuse décrit la commande ; le lien est créé à l'envoi. */
export function NewOrderScreen({ profile, couriers, error }: NewOrderScreenProps) {
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("");
  const total = (Number(price) || 0) + (Number(fee) || 0);
  const { itemLabel, itemPriceXof, deliveryFeeXof, neighborhood, landmark } = ORDER_LIMITS;

  return (
    <AccountScreen
      profile={profile}
      backTo="/vendeuse"
      footer={
        <button
          type="submit"
          form={FORM_ID}
          className="btn btn-primary"
          disabled={pending || couriers.length === 0}
        >
          {pending ? "Création du lien…" : "Créer le lien"}
        </button>
      }
    >
      <h1 className="h1">Nouvelle commande</h1>

      {couriers.length === 0 && (
        <Banner tone="warn">Aucun livreur n'est encore lié à votre compte.</Banner>
      )}
      {error && <Banner tone="danger">{error}</Banner>}

      <Form method="post" id={FORM_ID} className="stack">
        <div className="field">
          <label htmlFor="itemLabel">Article</label>
          <input
            id="itemLabel"
            name="itemLabel"
            className="input"
            minLength={itemLabel.min}
            maxLength={itemLabel.max}
            placeholder="Robe en wax, taille M"
            required
          />
          <span className="hint">{itemLabel.max} caractères au plus</span>
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="itemPriceXof">Prix de l'article (F)</label>
            <input
              id="itemPriceXof"
              name="itemPriceXof"
              className="input"
              type="number"
              inputMode="numeric"
              min={itemPriceXof.min}
              max={itemPriceXof.max}
              step={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="deliveryFeeXof">Livraison (F)</label>
            <input
              id="deliveryFeeXof"
              name="deliveryFeeXof"
              className="input"
              type="number"
              inputMode="numeric"
              min={deliveryFeeXof.min}
              max={deliveryFeeXof.max}
              step={1}
              value={fee}
              onChange={(event) => setFee(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="neighborhood">Quartier</label>
          <input
            id="neighborhood"
            name="neighborhood"
            className="input"
            minLength={neighborhood.min}
            maxLength={neighborhood.max}
            placeholder="Sacré-Cœur 3"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="landmark">Repère</label>
          <textarea
            id="landmark"
            name="landmark"
            className="input"
            maxLength={landmark.max}
            placeholder="Derrière la boulangerie, portail bleu"
          />
        </div>

        <div className="field">
          <label htmlFor="courierId">Livreur</label>
          <select id="courierId" name="courierId" className="input" required>
            {couriers.map((courier) => (
              <option key={courier.id} value={courier.id}>
                {courier.displayName} · n° … {courier.phoneLast2}
              </option>
            ))}
          </select>
        </div>
      </Form>

      <div className="card small">
        <div className="row">
          <span className="muted">L'acheteur paiera</span>
          <span className="v">{formatXof(total)}</span>
        </div>
        <p className="muted">Plafond du pilote : {formatXof(itemPriceXof.max)} par article.</p>
      </div>
    </AccountScreen>
  );
}
