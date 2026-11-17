import type { ReactNode } from "react";
import { Form, useNavigation } from "react-router";

export interface ActionButtonProps {
  /** Valeur du champ « intent » : l'action de la route sait ainsi quoi faire. */
  intent: string;
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  /** Question posée avant d'envoyer, quand l'action ne se rattrape pas. */
  confirm?: string;
}

/**
 * Un bouton qui envoie une action au serveur. Sans JavaScript, c'est un simple formulaire ;
 * avec, il se désactive pendant l'envoi pour éviter les doubles clics.
 */
export function ActionButton({
  intent,
  children,
  className = "btn btn-primary",
  pendingLabel = "Un instant…",
  confirm,
}: ActionButtonProps) {
  const navigation = useNavigation();
  const pending = navigation.state !== "idle" && navigation.formData?.get("intent") === intent;

  return (
    <Form
      method="post"
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" name="intent" value={intent} className={className} disabled={pending}>
        {pending ? pendingLabel : children}
      </button>
    </Form>
  );
}
