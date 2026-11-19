import { DeliveriesScreen } from "../features/courier/screens/deliveries-screen";
import { courierApi } from "../lib/api/account-api.server";
import { requireAccount } from "../lib/session.server";
import { usePolling } from "../lib/use-polling";
import type { Route } from "./+types/courier-deliveries";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Mes courses · Wóor" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const profile = await requireAccount(request, "courier");
  const deliveries = await courierApi.deliveries(request.headers.get("cookie"));
  return { profile, deliveries };
}

export default function CourierDeliveriesRoute({ loaderData }: Route.ComponentProps) {
  // Une course apparaît dès que l’acheteur a payé.
  usePolling(5_000, true);
  return <DeliveriesScreen {...loaderData} />;
}
