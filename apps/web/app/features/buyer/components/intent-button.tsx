import { ActionButton, type ActionButtonProps } from "../../../components/ui/action-button";
import type { BuyerIntent } from "../buyer-intents";

interface IntentButtonProps extends ActionButtonProps {
  intent: BuyerIntent;
}

/** Bouton d'action de l'acheteur : seules ses actions connues sont acceptées. */
export function IntentButton(props: IntentButtonProps) {
  return <ActionButton {...props} />;
}
