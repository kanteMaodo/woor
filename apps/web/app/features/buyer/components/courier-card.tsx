import { formatTime } from "../../../lib/format";
import type { BuyerOrderView } from "../../../lib/api/buyer-schemas";

/**
 * Prénom du livreur et deux derniers chiffres de son numéro :
 * de quoi reconnaître le vrai livreur, sans exposer son numéro.
 */
export function CourierCard({ view }: { view: BuyerOrderView }) {
  if (!view.courierFirstName) {
    return null;
  }
  const initial = view.courierFirstName.charAt(0).toUpperCase();

  return (
    <div className="card">
      <div className="person">
        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="kv">
          <span>
            Votre livreur : <b>{view.courierFirstName}</b>
          </span>
          {view.courierPhoneLast2 && (
            <span className="small muted">Numéro qui finit par … {view.courierPhoneLast2}</span>
          )}
          {view.pickedUpAt && (
            <span className="small muted">Colis ramassé à {formatTime(view.pickedUpAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
