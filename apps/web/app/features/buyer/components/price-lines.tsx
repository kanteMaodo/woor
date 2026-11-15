import { formatXof } from "../../../lib/format";

interface PriceLinesProps {
  itemPriceXof: number;
  deliveryFeeXof: number;
  totalXof: number;
  totalLabel?: string;
}

/** Article, livraison et total, avec des chiffres alignés. */
export function PriceLines({
  itemPriceXof,
  deliveryFeeXof,
  totalXof,
  totalLabel = "Total",
}: PriceLinesProps) {
  return (
    <>
      <div className="row">
        <span className="muted">Article</span>
        <span className="v">{formatXof(itemPriceXof)}</span>
      </div>
      <div className="row">
        <span className="muted">Livraison</span>
        <span className="v">{formatXof(deliveryFeeXof)}</span>
      </div>
      <div className="row total">
        <span>{totalLabel}</span>
        <span className="v">{formatXof(totalXof)}</span>
      </div>
    </>
  );
}
