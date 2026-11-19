import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { findProfile, HOME_BY_ROLE } from "./lib/session.server";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/landing.css";
import "./styles/auth.css";
import "./styles/app.css";
import "./styles/identity.css";

export async function loader({ request }: Route.LoaderArgs) {
  // A visitor without an account cookie never needs the API to read the public site.
  const hasSession = request.headers
    .get("cookie")
    ?.split(";")
    .some((part) => /^woor_session=.+/.test(part.trim()));
  const profile = hasSession ? await findProfile(request).catch(() => null) : null;
  return { accountHome: profile ? HOME_BY_ROLE[profile.role] : null };
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0B6E4F" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="page">
      <h1>{isNotFound ? "Page introuvable" : "Une erreur est survenue"}</h1>
      <p className="muted">
        {isNotFound
          ? "Ce lien n'existe pas ou n'est plus valable."
          : "Réessayez dans un instant. Vos paiements bloqués restent protégés."}
      </p>
    </main>
  );
}
