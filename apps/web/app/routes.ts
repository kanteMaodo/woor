import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Lien partagé par la vendeuse sur WhatsApp, Instagram ou TikTok.
  route("o/:token", "routes/buyer-order.tsx"),

  // Comptes : connexion par numéro et PIN.
  route("connexion", "routes/login.tsx"),
  route("deconnexion", "routes/logout.tsx"),

  // Espace de la vendeuse.
  route("vendeuse", "routes/seller-orders.tsx"),
  route("vendeuse/nouvelle", "routes/seller-new-order.tsx"),
  route("vendeuse/commandes/:id", "routes/seller-order.tsx"),

  // Espace du livreur.
  route("livreur", "routes/courier-deliveries.tsx"),
  route("livreur/courses/:id", "routes/courier-delivery.tsx"),

  // Galerie des écrans avec des données fictives, refusée en production.
  route("apercu/:slug?", "routes/preview.tsx"),
] satisfies RouteConfig;
