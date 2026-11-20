import { CopyButton } from "../../../components/ui/copy-button";
import { Icon } from "../../../components/ui/icon";
import { Screen } from "../../../components/ui/screen";

interface OpenInBrowserScreenProps {
  chromeIntentUrl: string;
  pageUrl: string;
}

/** B2 : le navigateur d’Instagram ou de TikTok peut effacer le code ; on passe par Chrome. */
export function OpenInBrowserScreen({ chromeIntentUrl, pageUrl }: OpenInBrowserScreenProps) {
  return (
    <Screen
      footer={
        <>
          <a className="btn btn-primary" href={chromeIntentUrl}>
            <Icon name="external" />
            Ouvrir dans Chrome
          </a>
          <CopyButton value={pageUrl} label="Copier le lien" />
        </>
      }
    >
      <div className="bigicon neutral">
        <Icon name="dots" size="xl" />
      </div>
      <h1 className="h1 center">Ouvrez cette page dans Chrome</h1>
      <p className="center muted">
        Le navigateur d’Instagram ou de TikTok peut effacer votre commande. Dans Chrome, votre code
        reste sur ce téléphone.
      </p>
      <div className="card">
        <p className="check">
          <Icon name="check-circle" />
          Touchez les trois points, en haut à droite
        </p>
        <p className="check">
          <Icon name="check-circle" />
          Choisissez « Ouvrir dans Chrome »
        </p>
      </div>
    </Screen>
  );
}

interface UnavailableScreenProps {
  reason: "claimed-elsewhere" | "closed";
}

/** Commande prise sur un autre téléphone, ou plus disponible. */
export function UnavailableScreen({ reason }: UnavailableScreenProps) {
  const claimed = reason === "claimed-elsewhere";
  return (
    <Screen>
      <div className="bigicon neutral">
        <Icon name={claimed ? "lock" : "clock"} size="xl" />
      </div>
      <h1 className="h1 center">
        {claimed ? "Commande déjà prise sur un autre téléphone" : "Commande plus disponible"}
      </h1>
      <p className="center muted">
        {claimed
          ? "Seul le téléphone qui a commandé peut payer et recevoir le code. Si c’était vous, rouvrez le lien depuis ce téléphone."
          : "Ce lien a expiré ou la commande est terminée. Demandez un nouveau lien à la vendeuse."}
      </p>
    </Screen>
  );
}
