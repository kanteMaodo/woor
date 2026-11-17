import { data } from "react-router";

import { DeliveryScreen } from "../features/courier/screens/delivery-screen";
import { courierApi } from "../lib/api/account-api.server";
import { ApiError, userMessageOrThrow } from "../lib/api/api-client.server";
import { assertSameOrigin } from "../lib/security.server";
import { requireAccount } from "../lib/session.server";
import type { Route } from "./+types/courier-delivery";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Course · Wóor" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const profile = await requireAccount(request, "courier");
  try {
    const delivery = await courierApi.delivery(params.id, request.headers.get("cookie"));
    return { profile, delivery };
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      throw data("Introuvable", { status: 404 });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  await requireAccount(request, "courier");
  const cookieHeader = request.headers.get("cookie");
  const form = await request.formData();

  try {
    switch (form.get("intent")) {
      case "pickup":
        await courierApi.confirmPickup(params.id, cookieHeader);
        return { error: null };
      case "code": {
        const submission = await courierApi.submitCode(
          params.id,
          String(form.get("code") ?? ""),
          cookieHeader,
        );
        return submission.result === "ok"
          ? { error: null }
          : { error: `Code faux. Il reste ${submission.attemptsLeft} essai(s).` };
      }
      default:
        throw data("Action inconnue", { status: 400 });
    }
  } catch (error) {
    return { error: userMessageOrThrow(error) };
  }
}

export default function CourierDeliveryRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <DeliveryScreen {...loaderData} error={actionData?.error ?? null} />;
}
