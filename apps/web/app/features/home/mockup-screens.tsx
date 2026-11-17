import { Chip } from "../../components/ui/chip";
import { Icon } from "../../components/ui/icon";
import { formatXof } from "../../lib/format";
import { OrderProgress } from "../orders/order-progress";
import { PhoneMockup } from "./phone-mockup";

/**
 * Écrans de Wóor reproduits avec les vrais composants, pour illustrer la page d'accueil.
 * Les montants et les noms sont des exemples.
 */

/** Acheteur : l'argent est bloqué, le livreur est en route. */
export function LockedMock({ className }: { className?: string }) {
  return (
    <PhoneMockup context="En route" className={className}>
      <OrderProgress state="in_transit" />
      <div className="trust">
        <span className="small">Bloqués dans votre wallet</span>
        <span className="amount">{formatXof(13_500)}</span>
        <span className="small">Robe en wax, taille M</span>
      </div>
      <div className="codebox">
        <span className="small muted">Votre code de remise</span>
        <span className="code">482 913</span>
      </div>
      <div className="banner info">
        <Icon name="moto" />
        <div>Moussa arrive. Donnez le code seulement à la remise.</div>
      </div>
    </PhoneMockup>
  );
}

/** Vendeuse : le lien prêt à partager sur WhatsApp. */
export function ShareMock({ className }: { className?: string }) {
  return (
    <PhoneMockup context="Lien prêt" className={className}>
      <div className="bubble">
        Bonjour ! Voici votre commande <b>Robe en wax, taille M</b> : {formatXof(13_500)} livraison
        comprise.
        <div className="linkcard">
          <span className="lc-ic">
            <Icon name="lock" />
          </span>
          <div className="kv">
            <b className="small">Wóor · Paiement protégé</b>
            <span className="small muted">Awa Couture · {formatXof(13_500)}</span>
          </div>
        </div>
      </div>
      <span className="btn btn-primary">
        <Icon name="send" />
        Envoyer sur WhatsApp
      </span>
    </PhoneMockup>
  );
}

/** Livreur : le code était juste, le paiement est débloqué. */
export function PaidMock({ className }: { className?: string }) {
  return (
    <PhoneMockup context="Terminé" className={className}>
      <div className="bigicon ok">
        <Icon name="check" size="xl" />
      </div>
      <p className="h2 center">Paiement confirmé</p>
      <p className="center">Remettez le colis.</p>
      <div className="card">
        <div className="row">
          <span className="muted">Votre course</span>
          <span className="v">{formatXof(1_500)}</span>
        </div>
      </div>
    </PhoneMockup>
  );
}

/** Vendeuse : ses commandes, avec l'argent qui l'attend. */
export function SellerListMock({ className }: { className?: string }) {
  const orders = [
    { label: "Robe en wax, taille M", place: "Sacré-Cœur 3", amount: 12_000, chip: "route" },
    { label: "Sac en cuir", place: "Liberté 6", amount: 15_000, chip: "locked" },
  ] as const;

  return (
    <PhoneMockup context="Awa Couture" className={className}>
      <div className="trust">
        <span className="small">À recevoir</span>
        <span className="amount">{formatXof(27_000)}</span>
        <span className="small">2 commandes bloquées chez les acheteurs</span>
      </div>
      {orders.map((order) => (
        <div key={order.label} className="item">
          <span className="top">
            <span className="t">{order.label}</span>
            {order.chip === "route" ? (
              <Chip tone="route" icon="moto" label="En route" />
            ) : (
              <Chip tone="locked" icon="lock" label="Bloqué" />
            )}
          </span>
          <span className="top">
            <span className="s">
              <Icon name="pin" size="sm" />
              {order.place}
            </span>
            <span>{formatXof(order.amount)}</span>
          </span>
        </div>
      ))}
    </PhoneMockup>
  );
}
