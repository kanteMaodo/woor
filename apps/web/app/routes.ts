import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Lien partagé par la vendeuse sur WhatsApp, Instagram ou TikTok.
  route("o/:token", "routes/buyer-order.tsx"),
  // Galerie des écrans avec des données fictives, refusée en production.
  route("apercu/:slug?", "routes/preview.tsx"),
] satisfies RouteConfig;
