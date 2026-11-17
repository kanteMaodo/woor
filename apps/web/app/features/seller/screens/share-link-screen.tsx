import { Link } from "react-router";

import { Banner } from "../../../components/ui/banner";
import { CopyButton } from "../../../components/ui/copy-button";
import { Icon } from "../../../components/ui/icon";
import type { Profile } from "../../../lib/api/account-schemas";
import { formatXof } from "../../../lib/format";
import { AccountScreen } from "../../account/account-screen";

export interface SharedOrder {
  orderId: string;
  itemLabel: string;
  totalXof: number;
  link: string;
}

interface ShareLinkScreenProps {
  profile: Profile;
  order: SharedOrder;
}

/** Message envoyé à l'acheteur, tel qu'il apparaîtra dans WhatsApp. */
export function shareMessage(order: SharedOrder): string {
  return (
    `Bonjour ! Voici votre commande ${order.itemLabel} : ${formatXof(order.totalXof)} livraison comprise. ` +
    `Payez en toute sécurité : votre argent reste bloqué jusqu'à la remise du colis.\n${order.link}`
  );
}

/**
 * S3 : le lien est prêt. Il n'est montré qu'ici : la base n'en garde que l'empreinte,
 * personne ne pourra le retrouver depuis la base.
 */
export function ShareLinkScreen({ profile, order }: ShareLinkScreenProps) {
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareMessage(order))}`;

  return (
    <AccountScreen
      profile={profile}
      title="Lien prêt"
      subtitle="Envoyez-le dans votre discussion avec l'acheteur."
    >
      <div className="split">
        <div className="split-main">
          <section className="panel">
            <h2>Aperçu du message</h2>
            <div className="bubble">
              Bonjour ! Voici votre commande <b>{order.itemLabel}</b> : {formatXof(order.totalXof)}{" "}
              livraison comprise. Payez en toute sécurité : votre argent reste bloqué jusqu'à la
              remise du colis.
              <div className="linkcard">
                <span className="lc-ic">
                  <Icon name="lock" />
                </span>
                <div className="kv">
                  <b className="small">Wóor · Paiement protégé</b>
                  <span className="small muted">
                    {profile.displayName} · {formatXof(order.totalXof)}
                  </span>
                </div>
              </div>
              <span className="link small">{order.link}</span>
            </div>
          </section>
          <Banner tone="warn" icon="clock">
            Gardez ce message : le lien n'est affiché qu'une fois. Un seul téléphone pourra
            commander.
          </Banner>
        </div>

        <aside className="split-side">
          <section className="panel summary">
            <h2>Partager</h2>
            <a href={whatsapp} className="btn btn-primary" target="_blank" rel="noreferrer">
              <Icon name="send" />
              Envoyer sur WhatsApp
            </a>
            <CopyButton value={order.link} label="Copier le lien" />
            <Link to={`/vendeuse/commandes/${order.orderId}`} className="btn btn-link">
              Suivre la commande
            </Link>
          </section>
        </aside>
      </div>
    </AccountScreen>
  );
}
