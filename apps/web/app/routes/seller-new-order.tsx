import { NewOrderScreen } from "../features/seller/screens/new-order-screen";
import { ShareLinkScreen } from "../features/seller/screens/share-link-screen";
import { sellerApi } from "../lib/api/account-api.server";
import { userMessageOrThrow } from "../lib/api/api-client.server";
import { readPlainForm } from "../lib/form-data.server";
import { formValues, NewOrderFormSchema } from "../lib/form-validation";
import { assertSameOrigin } from "../lib/security.server";
import { requireAccount } from "../lib/session.server";
import type { Route } from "./+types/seller-new-order";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Nouvelle commande · Wóor" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const profile = await requireAccount(request, "seller");
  const couriers = await sellerApi.couriers(request.headers.get("cookie"));
  return { profile, couriers };
}

/**
 * Crée la commande et montre le lien aussitôt, dans la réponse même :
 * le jeton n'est jamais stocké, ni en base ni dans une adresse de page.
 */
export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  await requireAccount(request, "seller");
  const parsed = NewOrderFormSchema.safeParse(formValues(await readPlainForm(request)));
  if (!parsed.success)
    return {
      shared: null,
      error: parsed.error.issues[0]?.message ?? "Vérifiez les informations de la commande.",
    };
  const input = parsed.data;

  try {
    const created = await sellerApi.create(input, request.headers.get("cookie"));
    const link = new URL(`/o/${created.orderToken}`, request.url).href;
    return {
      shared: {
        orderId: created.orderId,
        itemLabel: input.itemLabel,
        totalXof: input.itemPriceXof + input.deliveryFeeXof,
        link,
      },
      error: null,
    };
  } catch (error) {
    return { shared: null, error: userMessageOrThrow(error) };
  }
}

export default function SellerNewOrderRoute({ loaderData, actionData }: Route.ComponentProps) {
  if (actionData?.shared) {
    return <ShareLinkScreen profile={loaderData.profile} order={actionData.shared} />;
  }
  return <NewOrderScreen {...loaderData} error={actionData?.error ?? null} />;
}
