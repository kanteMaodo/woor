import { Form, useNavigation } from "react-router";

import { Banner } from "../../components/ui/banner";
import { Screen } from "../../components/ui/screen";

interface LoginScreenProps {
  error: string | null;
  /** Numéro déjà saisi, rendu après un échec pour ne pas le retaper. */
  phone: string;
}

/** O2 : connexion par numéro et PIN de secours. Les passkeys viendront après le pilote. */
export function LoginScreen({ error, phone }: LoginScreenProps) {
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";

  return (
    <Screen context="Vendeuses et livreurs">
      <h1 className="h1">Se connecter</h1>
      <Form method="post" className="stack">
        <div className="field">
          <label htmlFor="phone">Numéro</label>
          <input
            id="phone"
            name="phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            placeholder="77 000 00 01"
            defaultValue={phone}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="pin">PIN à 6 chiffres</label>
          <input
            id="pin"
            name="pin"
            className="input code-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="\d{6}"
            maxLength={6}
            required
          />
        </div>
        {error && <Banner tone="danger">{error}</Banner>}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </Form>
      <p className="note">Pas de compte ? L'accès se fait sur invitation.</p>
    </Screen>
  );
}
