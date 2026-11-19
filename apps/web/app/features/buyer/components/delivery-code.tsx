import { useEffect, useState } from "react";

import { Banner } from "../../../components/ui/banner";
import { Icon } from "../../../components/ui/icon";
import { formatCode } from "../../../lib/format";
import { IntentButton } from "./intent-button";

interface DeliveryCodeProps {
  orderToken: string;
  /** Le code a déjà été donné à ce téléphone, lors d’une visite précédente. */
  codeIssued: boolean;
  /** Code reçu à l’instant du serveur, une seule fois. */
  revealedCode: string | null;
}

/**
 * Le code de remise. Le serveur ne le donne qu’une fois : il est alors gardé sur ce téléphone
 * et ne quitte plus l’appareil. Masqué par défaut, il ne s’affiche que sur demande.
 */
export function DeliveryCode({ orderToken, codeIssued, revealedCode }: DeliveryCodeProps) {
  const storageKey = `woor:code:${orderToken}`;
  const [storedCode, setStoredCode] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStoredCode(readStorage(storageKey));
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (revealedCode) {
      writeStorage(storageKey, revealedCode);
      setStoredCode(revealedCode);
      setVisible(true);
    }
  }, [revealedCode, storageKey]);

  const code = revealedCode ?? storedCode;
  const lost = mounted && codeIssued && !code;

  return (
    <>
      <div className="codebox">
        <div className="small muted">Votre code de remise</div>
        <div className="code" aria-live="polite">
          {code && visible ? formatCode(code) : "••• •••"}
        </div>
        {code && (
          <button type="button" className="btn btn-link" onClick={() => setVisible(!visible)}>
            <Icon name={visible ? "eye-off" : "eye"} />
            {visible ? "Masquer le code" : "Afficher mon code"}
          </button>
        )}
      </div>

      {!code && !codeIssued && (
        <IntentButton intent="code" pendingLabel="Préparation du code…">
          <Icon name="eye" />
          Afficher mon code
        </IntentButton>
      )}

      {lost && (
        <Banner tone="danger">
          <p>Ce code a déjà été affiché sur un autre navigateur de ce téléphone.</p>
          <p>Code perdu : seul un arbitre peut en créer un nouveau.</p>
        </Banner>
      )}

      <Banner tone="warn" icon="key">
        <p>Donnez ce code seulement quand vous avez le colis en main.</p>
        <p>Wóor ne vous appellera jamais pour demander ce code.</p>
      </Banner>
    </>
  );
}

/** Le stockage peut être bloqué (navigation privée) : la page doit marcher sans lui. */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sans stockage, le code reste affiché tant que la page est ouverte.
  }
}
