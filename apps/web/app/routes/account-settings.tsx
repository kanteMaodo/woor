import { MyAccountScreen } from "../features/account/my-account-screen";
import { requireAccount } from "../lib/session.server";
import type { Route } from "./+types/account-settings";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Mon compte · Wóor" }];
}

/** Compte de la vendeuse ou du livreur : connecté par PIN, passkey à venir. */
export async function loader({ request }: Route.LoaderArgs) {
  const role = new URL(request.url).pathname.startsWith("/livreur") ? "courier" : "seller";
  const profile = await requireAccount(request, role);
  return {
    profile,
    security: {
      phoneLast2: null,
      hasPasskey: false,
      passkeyAddedAt: null,
      hasPin: true,
      notifications: false,
      sessions: [{ id: "current", label: "Cet appareil", current: true, expiresAt: null }],
    },
  };
}

export default function AccountSettingsRoute({ loaderData }: Route.ComponentProps) {
  return <MyAccountScreen {...loaderData} />;
}
