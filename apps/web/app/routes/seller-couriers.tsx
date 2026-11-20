import { CouriersScreen } from "../features/seller/screens/couriers-screen";
import { sellerApi } from "../lib/api/account-api.server";
import { requireAccount } from "../lib/session.server";
import type { Route } from "./+types/seller-couriers";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Mes livreurs · Wóor" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const profile = await requireAccount(request, "seller");
  const linked = await sellerApi.couriers(request.headers.get("cookie"));
  // Un livreur lié est actif et vérifié : la base n’accepte pas d’autre livreur sur une commande.
  const couriers = linked.map((courier) => ({
    ...courier,
    status: "active" as const,
    detail: "Identité vérifiée",
  }));
  return { profile, couriers };
}

export default function SellerCouriersRoute({ loaderData }: Route.ComponentProps) {
  return <CouriersScreen {...loaderData} />;
}
