import { Link } from "react-router";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Wóor" },
    {
      name: "description",
      content: "Votre argent est bloqué, pas encaissé, jusqu'à la remise du colis.",
    },
  ];
}

export default function Home() {
  return (
    <main className="page">
      <h1>Wóor</h1>
      <p>Votre argent est bloqué, pas encaissé, jusqu'à la remise du colis.</p>
      <Link to="/connexion" className="btn btn-primary">
        Espace vendeuse et livreur
      </Link>
    </main>
  );
}
