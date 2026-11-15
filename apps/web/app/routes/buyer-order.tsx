import type { InvoiceKind } from "@woor/core";
import { data, redirect } from "react-router";

import { BuyerOrderPage } from "../features/buyer/buyer-order-page";
import { isBuyerIntent } from "../features/buyer/buyer-intents";
import type { BuyerPageContext } from "../features/buyer/buyer-page-context";
import { selectBuyerScreen, shouldPoll } from "../features/buyer/buyer-screen";
import { ApiError, cookieHeaderFrom } from "../lib/api/api-client.server";
import { buyerApi } from "../lib/api/buyer-api.server";
import { invoiceQrSvg } from "../lib/qr.server";
import { assertSameOrigin, isInAppBrowser } from "../lib/security.server";
import { usePolling } from "../lib/use-polling";
import type { Route } from "./+types/buyer-order";

const POLL_INTERVAL_MS = 5_000;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Votre commande · Wóor" }, { name: "robots", content: "noindex, nofollow" }];
}

/** Le jeton du lien ne doit fuir ni vers un autre site, ni dans un moteur de recherche. */
export function headers() {
  return {
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "no-store",
  };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const token = params.token;
  const cookieHeader = request.headers.get("cookie");

  const view = await buyerApi.findMyOrder(token, cookieHeader);
  const summary = view ? null : await loadPublicSummary(token, cookieHeader);

  const qr: Partial<Record<InvoiceKind, string>> = {};
  for (const invoice of view?.invoices ?? []) {
    if (invoice.state === "open") {
      qr[invoice.kind] = await invoiceQrSvg(invoice.bolt11);
    }
  }

  const url = new URL(request.url);
  return {
    token,
    view,
    summary,
    qr,
    now: new Date().toISOString(),
    inAppBrowser: isInAppBrowser(request),
    pageUrl: url.href,
    chromeIntentUrl: `intent://${url.host}${url.pathname}#Intent;scheme=https;package=com.android.chrome;end`,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const token = params.token;
  const cookieHeader = request.headers.get("cookie");
  const intent = (await request.formData()).get("intent");

  if (!isBuyerIntent(intent)) {
    throw data("Action inconnue", { status: 400 });
  }

  try {
    switch (intent) {
      case "claim": {
        // Le téléphone reçoit son cookie, puis on demande aussitôt les deux factures.
        // Le cookie est relayé dans tous les cas : sans lui, le téléphone ne serait plus reconnu.
        const { setCookies } = await buyerApi.claim(token, cookieHeader);
        const headers = new Headers();
        for (const cookie of setCookies) {
          headers.append("Set-Cookie", cookie);
        }
        const boundCookie = setCookies.length > 0 ? cookieHeaderFrom(setCookies) : cookieHeader;
        try {
          await buyerApi.requestInvoices(token, boundCookie);
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            return data({ revealedCode: null, error: error.message }, { headers });
          }
          throw error;
        }
        return redirect(`/o/${token}`, { headers });
      }
      case "invoices":
        await buyerApi.requestInvoices(token, cookieHeader);
        return redirect(`/o/${token}`);
      case "code":
        return { revealedCode: await buyerApi.revealCode(token, cookieHeader), error: null };
      case "cancel":
        await buyerApi.cancel(token, cookieHeader);
        return redirect(`/o/${token}`);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return { revealedCode: null, error: error.message };
    }
    throw error;
  }
}

export default function BuyerOrderRoute({ loaderData, actionData }: Route.ComponentProps) {
  usePolling(POLL_INTERVAL_MS, shouldPoll(loaderData.view?.state));

  const screen = selectBuyerScreen(loaderData);
  const context: BuyerPageContext = {
    orderToken: loaderData.token,
    now: loaderData.now,
    qr: loaderData.qr,
    chromeIntentUrl: loaderData.chromeIntentUrl,
    pageUrl: loaderData.pageUrl,
    revealedCode: actionData?.revealedCode ?? null,
    error: actionData?.error ?? null,
  };

  return <BuyerOrderPage screen={screen} context={context} />;
}

/** Jeton inconnu ou mal formé : la page d'erreur 404 de l'application. */
async function loadPublicSummary(token: string, cookieHeader: string | null) {
  try {
    return await buyerApi.getPublicOrder(token, cookieHeader);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      throw data("Introuvable", { status: 404 });
    }
    throw error;
  }
}
