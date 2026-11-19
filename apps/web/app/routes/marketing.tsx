import { data } from "react-router";

import { MarketingPage } from "../features/home/marketing-pages";
import { PAGE_CONTENT } from "../features/home/marketing-content";
import type { MarketingPageKey } from "../features/home/marketing-content";
import type { Route } from "./+types/marketing";

export function loader({ request, params }: Route.LoaderArgs) {
  if (params.audience && !["vendeurs", "acheteurs", "livreurs"].includes(params.audience)) {
    throw data("Page introuvable", { status: 404 });
  }
  const key = new URL(request.url).pathname.replace(/\/$/, "").split("/").at(-1) ?? "";
  if (!Object.hasOwn(PAGE_CONTENT, key)) throw data("Page introuvable", { status: 404 });
  return { pageKey: key as MarketingPageKey };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Page introuvable · Wóor" }];
  const page = PAGE_CONTENT[loaderData.pageKey];
  return [{ title: `${page.label} · Wóor` }, { name: "description", content: page.description }];
}

export default function MarketingRoute({ loaderData }: Route.ComponentProps) {
  return <MarketingPage pageKey={loaderData.pageKey} />;
}
