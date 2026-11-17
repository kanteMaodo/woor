import { data } from "react-router";

import { SellerOrderScreen } from "../features/seller/screens/seller-order-screen";
import { sellerApi } from "../lib/api/account-api.server";
import { ApiError, userMessageOrThrow } from "../lib/api/api-client.server";
import { assertSameOrigin } from "../lib/security.server";
import { requireAccount } from "../lib/session.server";
import { usePolling } from "../lib/use-polling";
import type { Route } from "./+types/seller-order";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Commande · Wóor" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const profile = await requireAccount(request, "seller");
  try {
    const order = await sellerApi.order(params.id, request.headers.get("cookie"));
    return { profile, order };
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      throw data("Introuvable", { status: 404 });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  await requireAccount(request, "seller");
  const intent = (await request.formData()).get("intent");
  if (intent !== "cancel") {
    throw data("Action inconnue", { status: 400 });
  }
  try {
    await sellerApi.cancel(params.id, request.headers.get("cookie"));
    return { error: null };
  } catch (error) {
    return { error: userMessageOrThrow(error) };
  }
}

export default function SellerOrderRoute({ loaderData, actionData }: Route.ComponentProps) {
  usePolling(5_000, true);
  return <SellerOrderScreen {...loaderData} error={actionData?.error ?? null} />;
}
