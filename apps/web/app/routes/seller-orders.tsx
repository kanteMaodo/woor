import { SellerOrdersScreen } from "../features/seller/screens/seller-orders-screen";
import { toSellerFilter } from "../features/seller/seller-orders";
import { sellerApi } from "../lib/api/account-api.server";
import { requireAccount } from "../lib/session.server";
import { usePolling } from "../lib/use-polling";
import type { Route } from "./+types/seller-orders";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Mes commandes · Wóor" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const profile = await requireAccount(request, "seller");
  const orders = await sellerApi.orders(request.headers.get("cookie"));
  const filter = toSellerFilter(new URL(request.url).searchParams.get("filtre"));
  return { profile, orders, filter };
}

export default function SellerOrdersRoute({ loaderData }: Route.ComponentProps) {
  // Les paiements arrivent sans prévenir : la liste se tient à jour seule.
  usePolling(5_000, true);
  return <SellerOrdersScreen {...loaderData} />;
}
