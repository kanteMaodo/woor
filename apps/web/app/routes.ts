import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Lien partagé par la vendeuse sur WhatsApp, Instagram ou TikTok.
  route("o/:token", "routes/buyer-order.tsx"),
] satisfies RouteConfig;
