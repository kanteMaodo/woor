import { formatSats, formatXof } from "../../lib/format";
import { Icon } from "./icon";

interface AmountProps {
  xof: number;
  sats?: number;
}

/** Le FCFA d'abord, en grand ; les sats en petit dessous, pour qui s'y intéresse. */
export function Amount({ xof, sats }: AmountProps) {
  return (
    <div>
      <div className="amount">{formatXof(xof)}</div>
      {sats !== undefined && (
        <div className="sats">
          <Icon name="bolt" size="sm" />
          {formatSats(sats)}
        </div>
      )}
    </div>
  );
}
