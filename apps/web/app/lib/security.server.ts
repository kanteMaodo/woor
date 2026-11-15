import { data } from "react-router";

/**
 * Refuse un envoi de formulaire venu d'un autre site.
 * Les navigateurs récents joignent toujours l'en-tête Origin à un POST.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!origin || new URL(origin).host !== host) {
    throw data("Origine refusée", { status: 403 });
  }
}

/** Navigateurs intégrés d'Instagram, Facebook et TikTok : ils peuvent effacer les données du site. */
export function isInAppBrowser(request: Request): boolean {
  const userAgent = request.headers.get("user-agent") ?? "";
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance/i.test(userAgent);
}
