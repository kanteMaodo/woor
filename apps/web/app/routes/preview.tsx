import type { InvoiceKind } from "@woor/core";
import { data, Link } from "react-router";

import { BuyerOrderPage } from "../features/buyer/buyer-order-page";
import type { BuyerPageContext } from "../features/buyer/buyer-page-context";
import { selectBuyerScreen } from "../features/buyer/buyer-screen";
import {
  type BuyerPreview,
  buildBuyerPreviews,
} from "../features/buyer/preview/buyer-fixtures.server";
import { ACCOUNT_CATALOG } from "../features/preview/account-catalog";
import { invoiceQrSvg } from "../lib/qr.server";
import type { Route } from "./+types/preview";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Aperçu des écrans · Wóor" }, { name: "robots", content: "noindex, nofollow" }];
}

/** Galerie des écrans avec des données fictives. N'existe pas en production. */
export async function loader({ params, request }: Route.LoaderArgs) {
  if (import.meta.env.PROD) {
    throw data("Introuvable", { status: 404 });
  }

  const now = new Date();
  const buyerPreviews = buildBuyerPreviews(now);
  const index = [...buyerPreviews, ...ACCOUNT_CATALOG].map(({ slug, label }) => ({ slug, label }));
  if (!params.slug) {
    return { index, current: null };
  }

  const account = ACCOUNT_CATALOG.find((candidate) => candidate.slug === params.slug);
  if (account) {
    const qrSvg = await invoiceQrSvg("WOOR-PICKUP:0190a1b2:demo-signature");
    return {
      index,
      current: { type: "account" as const, slug: account.slug, label: account.label, qrSvg },
    };
  }

  const buyer = buyerPreviews.find((candidate) => candidate.slug === params.slug);
  if (!buyer) {
    throw data("Introuvable", { status: 404 });
  }
  return { index, current: { type: "buyer" as const, ...(await buyerContext(buyer, request)) } };
}

async function buyerContext(preview: BuyerPreview, request: Request) {
  const qr: Partial<Record<InvoiceKind, string>> = {};
  for (const invoice of preview.view?.invoices ?? []) {
    if (invoice.state === "open") {
      qr[invoice.kind] = await invoiceQrSvg(invoice.bolt11);
    }
  }
  const url = new URL(request.url);
  return {
    ...preview,
    qr,
    now: new Date().toISOString(),
    pageUrl: url.href,
    chromeIntentUrl: `intent://${url.host}${url.pathname}#Intent;scheme=https;package=com.android.chrome;end`,
  };
}

export default function PreviewRoute({ loaderData }: Route.ComponentProps) {
  const { index, current } = loaderData;

  if (!current) {
    return (
      <main className="page">
        <h1 className="h1">Aperçu des écrans</h1>
        <p className="small muted">Données fictives. Les boutons ne déclenchent rien ici.</p>
        <ul>
          {index.map((entry) => (
            <li key={entry.slug}>
              <Link to={`/apercu/${entry.slug}`}>{entry.label}</Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const position = index.findIndex((entry) => entry.slug === current.slug);
  const previous = index[position - 1];
  const next = index[position + 1];

  return (
    <>
      <nav className="preview-nav small">
        {previous ? <Link to={`/apercu/${previous.slug}`}>‹ Précédent</Link> : <span />}
        <Link to="/apercu">{current.label}</Link>
        {next ? <Link to={`/apercu/${next.slug}`}>Suivant ›</Link> : <span />}
      </nav>
      {current.type === "account" ? (
        ACCOUNT_CATALOG.find((entry) => entry.slug === current.slug)?.render({
          qrSvg: current.qrSvg,
        })
      ) : (
        <BuyerOrderPage screen={selectBuyerScreen(current)} context={buyerPageContext(current)} />
      )}
    </>
  );
}

function buyerPageContext(current: Awaited<ReturnType<typeof buyerContext>>): BuyerPageContext {
  return {
    orderToken: "apercu",
    now: current.now,
    qr: current.qr,
    chromeIntentUrl: current.chromeIntentUrl,
    pageUrl: current.pageUrl,
    revealedCode: current.revealedCode,
    error: null,
  };
}
