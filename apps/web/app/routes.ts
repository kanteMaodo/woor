import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("fonctionnement", "routes/marketing.tsx", { id: "marketing-how" }),
  route("solutions/:audience", "routes/marketing.tsx", { id: "marketing-solution" }),
  route("securite", "routes/marketing.tsx", { id: "marketing-security" }),
  route("aide", "routes/marketing.tsx", { id: "marketing-help" }),
  route("a-propos", "routes/marketing.tsx", { id: "marketing-about" }),
  route("contact", "routes/marketing.tsx", { id: "marketing-contact" }),
  // Lien partagé par la vendeuse sur WhatsApp, Instagram ou TikTok.
  route("o/:token", "routes/buyer-order.tsx"),

  // Comptes : connexion par numéro et PIN.
  route("connexion", "routes/login.tsx"),
  route("deconnexion", "routes/logout.tsx"),

  // Espace de la vendeuse.
  route("vendeuse", "routes/seller-orders.tsx"),
  route("vendeuse/nouvelle", "routes/seller-new-order.tsx"),
  route("vendeuse/commandes/:id", "routes/seller-order.tsx"),
  route("vendeuse/livreurs", "routes/seller-couriers.tsx"),
  route("vendeuse/versements", "routes/account-payouts.tsx", { id: "seller-payouts" }),
  route("vendeuse/compte", "routes/account-settings.tsx", { id: "seller-account" }),

  // Espace du livreur.
  route("livreur", "routes/courier-deliveries.tsx"),
  route("livreur/courses/:id", "routes/courier-delivery.tsx"),
  route("livreur/versements", "routes/account-payouts.tsx", { id: "courier-payouts" }),
  route("livreur/compte", "routes/account-settings.tsx", { id: "courier-account" }),

  // Galerie des écrans avec des données fictives, refusée en production.
  route("apercu/:slug?", "routes/preview.tsx"),
] satisfies RouteConfig;
