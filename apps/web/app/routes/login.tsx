import { redirect } from "react-router";

import { type DemoAccount, LoginScreen } from "../features/account/login-screen";
import { authApi } from "../lib/api/account-api.server";
import { userMessageOrThrow } from "../lib/api/api-client.server";
import { readPlainForm } from "../lib/form-data.server";
import { formValues, LoginFormSchema } from "../lib/form-validation";
import { assertSameOrigin } from "../lib/security.server";
import { findProfile, HOME_BY_ROLE } from "../lib/session.server";
import type { Route } from "./+types/login";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Se connecter · Wóor" }, { name: "robots", content: "noindex, nofollow" }];
}

/** Comptes créés par le script seed:demo de l'API. */
const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: "Vendeuse", phone: "77 000 00 01", pin: "111111" },
  { label: "Livreur", phone: "77 000 00 02", pin: "222222" },
];

/** Démonstration : en développement, ou en ligne si WOOR_DEMO=1 (le MVP testé par le jury). */
function demoEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.WOOR_DEMO === "1";
}

/** Déjà connecté : directement vers son espace. */
export async function loader({ request }: Route.LoaderArgs) {
  // API injoignable : on montre quand même le formulaire, l'envoi dira ce qui ne va pas.
  const profile = await findProfile(request).catch(() => null);
  if (profile) {
    throw redirect(HOME_BY_ROLE[profile.role]);
  }
  return { demoAccounts: demoEnabled() ? DEMO_ACCOUNTS : [] };
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await readPlainForm(request);
  const parsed = LoginFormSchema.safeParse(formValues(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez vos identifiants.",
      phone: typeof form.get("phone") === "string" ? String(form.get("phone")) : "",
    };
  const { phone, pin } = parsed.data;

  try {
    const { body: profile, setCookies } = await authApi.logIn(phone, pin);
    const headers = new Headers();
    for (const cookie of setCookies) {
      headers.append("Set-Cookie", cookie);
    }
    return redirect(HOME_BY_ROLE[profile.role], { headers });
  } catch (error) {
    return { error: userMessageOrThrow(error), phone };
  }
}

export default function LoginRoute({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <LoginScreen
      error={actionData?.error ?? null}
      phone={actionData?.phone ?? ""}
      demoAccounts={loaderData.demoAccounts}
    />
  );
}
