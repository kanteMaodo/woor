import type { InvoiceKind } from "@woor/core";
import { data, Link } from "react-router";

import { BuyerOrderPage } from "../features/buyer/buyer-order-page";
import type { BuyerPageContext } from "../features/buyer/buyer-page-context";
import { selectBuyerScreen } from "../features/buyer/buyer-screen";
import { buildBuyerPreviews } from "../features/buyer/preview/buyer-fixtures.server";
import { invoiceQrSvg } from "../lib/qr.server";
import type { Route } from "./+types/preview";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Aperçu des écrans · Wóor" }, { name: "robots", content: "noindex, nofollow" }];
}

/** Galerie des écrans avec des commandes fictives. N'existe pas en production. */
export async function loader({ params, request }: Route.LoaderArgs) {
  if (import.meta.env.PROD) {
    throw data("Introuvable", { status: 404 });
  }

  const previews = buildBuyerPreviews(new Date());
  const index = previews.map(({ slug, label }) => ({ slug, label }));
  if (!params.slug) {
    return { index, current: null };
  }

  const preview = previews.find((candidate) => candidate.slug === params.slug);
  if (!preview) {
    throw data("Introuvable", { status: 404 });
  }

  const qr: Partial<Record<InvoiceKind, string>> = {};
  for (const invoice of preview.view?.invoices ?? []) {
    if (invoice.state === "open") {
      qr[invoice.kind] = await invoiceQrSvg(invoice.bolt11);
    }
  }

  const url = new URL(request.url);
  return {
    index,
    current: {
      ...preview,
      qr,
      now: new Date().toISOString(),
      pageUrl: url.href,
      chromeIntentUrl: `intent://${url.host}${url.pathname}#Intent;scheme=https;package=com.android.chrome;end`,
    },
  };
}

export default function PreviewRoute({ loaderData }: Route.ComponentProps) {
  const { index, current } = loaderData;

  if (!current) {
    return (
      <main className="page">
        <h1 className="h1">Aperçu des écrans</h1>
        <p className="small muted">Commandes fictives. Les boutons ne déclenchent rien ici.</p>
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
  const context: BuyerPageContext = {
    orderToken: "apercu",
    now: current.now,
    qr: current.qr,
    chromeIntentUrl: current.chromeIntentUrl,
    pageUrl: current.pageUrl,
    revealedCode: current.revealedCode,
    error: null,
  };

  return (
    <>
      <nav
        className="small"
        style={{ display: "flex", justifyContent: "space-between", padding: 8 }}
      >
        {previous ? <Link to={`/apercu/${previous.slug}`}>‹ Précédent</Link> : <span />}
        <Link to="/apercu">{current.label}</Link>
        {next ? <Link to={`/apercu/${next.slug}`}>Suivant ›</Link> : <span />}
      </nav>
      <BuyerOrderPage screen={selectBuyerScreen(current)} context={context} />
    </>
  );
}
