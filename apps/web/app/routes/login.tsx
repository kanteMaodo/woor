import { redirect } from "react-router";

import { LoginScreen } from "../features/account/login-screen";
import { authApi } from "../lib/api/account-api.server";
import { userMessageOrThrow } from "../lib/api/api-client.server";
import { assertSameOrigin } from "../lib/security.server";
import { findProfile, HOME_BY_ROLE } from "../lib/session.server";
import type { Route } from "./+types/login";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Se connecter · Wóor" }, { name: "robots", content: "noindex, nofollow" }];
}

/** Déjà connecté : directement vers son espace. */
export async function loader({ request }: Route.LoaderArgs) {
  const profile = await findProfile(request);
  if (profile) {
    throw redirect(HOME_BY_ROLE[profile.role]);
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const phone = String(form.get("phone") ?? "");
  const pin = String(form.get("pin") ?? "");

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

export default function LoginRoute({ actionData }: Route.ComponentProps) {
  return <LoginScreen error={actionData?.error ?? null} phone={actionData?.phone ?? ""} />;
}
