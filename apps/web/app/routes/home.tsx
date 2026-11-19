import { LandingPage } from "../features/home/landing-page";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Wóor · Paiement protégé pour la vente en ligne" },
    {
      name: "description",
      content:
        "Votre argent est bloqué, pas encaissé, jusqu’à la remise du colis. Paiement Lightning protégé pour la vente sur WhatsApp à Dakar.",
    },
  ];
}

export default function Home() {
  return <LandingPage />;
}
