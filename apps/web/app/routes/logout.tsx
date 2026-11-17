import { redirect } from "react-router";

import { authApi } from "../lib/api/account-api.server";
import { assertSameOrigin } from "../lib/security.server";
import type { Route } from "./+types/logout";

/** Déconnexion par POST seulement : un lien piégé ne peut pas déconnecter quelqu'un. */
export function loader() {
  return redirect("/connexion");
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const { setCookies } = await authApi.logOut(request.headers.get("cookie"));
  const headers = new Headers();
  for (const cookie of setCookies) {
    headers.append("Set-Cookie", cookie);
  }
  return redirect("/connexion", { headers });
}
