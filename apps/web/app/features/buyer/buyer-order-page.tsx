import type { BuyerPageContext } from "./buyer-page-context";
import type { BuyerScreen } from "./buyer-screen";
import { OpenInBrowserScreen, UnavailableScreen } from "./screens/entry-screens";
import { ClosedScreen, DeliveredScreen } from "./screens/final-screens";
import { LockedScreen, TrackingScreen } from "./screens/locked-screens";
import {
  ConfirmingScreen,
  PaymentExpiredScreen,
  PaymentScreen,
  PreparingScreen,
} from "./screens/payment-screens";
import { SummaryScreen } from "./screens/summary-screen";

interface BuyerOrderPageProps {
  screen: BuyerScreen;
  context: BuyerPageContext;
}

/** Affiche l'écran choisi par selectBuyerScreen. Aucune règle ici, seulement l'aiguillage. */
export function BuyerOrderPage({ screen, context }: BuyerOrderPageProps) {
  switch (screen.kind) {
    case "summary":
      return <SummaryScreen summary={screen.summary} error={context.error} />;
    case "open-in-browser":
      return (
        <OpenInBrowserScreen chromeIntentUrl={context.chromeIntentUrl} pageUrl={context.pageUrl} />
      );
    case "unavailable":
      return <UnavailableScreen reason={screen.reason} />;
    case "preparing":
      return <PreparingScreen context={context} />;
    case "payment":
      return (
        <PaymentScreen
          view={screen.view}
          step={screen.step}
          invoice={screen.invoice}
          context={context}
        />
      );
    case "confirming":
      return <ConfirmingScreen />;
    case "payment-expired":
      return <PaymentExpiredScreen />;
    case "locked":
      return <LockedScreen view={screen.view} context={context} />;
    case "tracking":
      return <TrackingScreen view={screen.view} context={context} />;
    case "delivered":
      return <DeliveredScreen view={screen.view} />;
    case "closed":
      return <ClosedScreen view={screen.view} />;
  }
}
