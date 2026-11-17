import { ORDER_LIMITS } from "@woor/core";
import { useState } from "react";
import { Form, useNavigation } from "react-router";

import { Banner } from "../../../components/ui/banner";
import { Icon } from "../../../components/ui/icon";
import type { LinkedCourier, Profile } from "../../../lib/api/account-schemas";
import { formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";

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
  const priceXof = Number(price) || 0;
  const feeXof = Number(fee) || 0;
  const { itemLabel, itemPriceXof, deliveryFeeXof, neighborhood, landmark } = ORDER_LIMITS;

  return (
    <AccountScreen
      profile={profile}
      backTo="/vendeuse"
      title="Nouvelle commande"
      subtitle="Décrivez la vente : l'acheteur recevra un lien de paiement protégé."
    >
      {couriers.length === 0 && (
        <Banner tone="warn">Aucun livreur n'est encore lié à votre compte.</Banner>
      )}
      {error && <Banner tone="danger">{error}</Banner>}

      <Form method="post" className="split">
        <div className="split-main">
          <section className="panel form-panel">
            <h2>
              <Icon name="box" /> L'article
            </h2>
            <div className="field">
              <label htmlFor="itemLabel">Description</label>
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
                  placeholder="12000"
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
                  placeholder="1500"
                  required
                />
              </div>
            </div>
          </section>

          <section className="panel form-panel">
            <h2>
              <Icon name="moto" /> La livraison
            </h2>
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
              <span className="hint">Chiffré : seul le livreur le lira, pendant la course.</span>
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
          </section>
        </div>

        <aside className="split-side">
          <section className="panel summary">
            <h2>Récapitulatif</h2>
            <div className="row">
              <span className="muted">Article, pour vous</span>
              <span>{formatXof(priceXof)}</span>
            </div>
            <div className="row">
              <span className="muted">Livraison, pour le livreur</span>
              <span>{formatXof(feeXof)}</span>
            </div>
            <div className="row total">
              <span>L'acheteur paiera</span>
              <span>{formatXof(priceXof + feeXof)}</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || couriers.length === 0}
            >
              <Icon name="send" />
              {pending ? "Création du lien…" : "Créer le lien"}
            </button>
            <p className="hint">
              Plafond du pilote : {formatXof(itemPriceXof.max)} par article. Le lien expire dans 24
              h s'il n'est pas payé.
            </p>
          </section>
        </aside>
      </Form>
    </AccountScreen>
  );
}
