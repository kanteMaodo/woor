import { PayoutsScreen } from "../features/account/payouts-screen";
import { requireAccount } from "../lib/session.server";
import type { Route } from "./+types/account-payouts";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Versements · Wóor" }];
}

/**
 * Versements de la vendeuse ou du livreur, selon l’adresse.
 * Pilote : aucun versement n’est encore parti, la liste est donc vide.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const role = new URL(request.url).pathname.startsWith("/livreur") ? "courier" : "seller";
  const profile = await requireAccount(request, role);
  return {
    profile,
    payouts: [],
    address: { current: null, testedAt: null, pendingChange: null },
  };
}

export default function AccountPayoutsRoute({ loaderData }: Route.ComponentProps) {
  return <PayoutsScreen {...loaderData} />;
}
