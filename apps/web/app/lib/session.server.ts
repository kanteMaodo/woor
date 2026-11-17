import { redirect } from "react-router";

import type { Profile } from "./api/account-schemas";
import { authApi } from "./api/account-api.server";
import { ApiError } from "./api/api-client.server";

type SpaceRole = "seller" | "courier";

/** Espace d'accueil de chaque rôle après la connexion. */
export const HOME_BY_ROLE: Record<Profile["role"], string> = {
  seller: "/vendeuse",
  courier: "/livreur",
  arbiter: "/connexion",
  admin: "/connexion",
};

/**
 * Exige une session du bon rôle : sans session, retour à la connexion ;
 * avec le mauvais rôle, renvoi vers son propre espace.
 */
export async function requireAccount(request: Request, role: SpaceRole): Promise<Profile> {
  const profile = await findProfile(request);
  if (!profile) {
    throw redirect("/connexion");
  }
  if (profile.role !== role) {
    throw redirect(HOME_BY_ROLE[profile.role]);
  }
  return profile;
}

/** Profil de la session, ou null si personne n'est connecté. */
export async function findProfile(request: Request): Promise<Profile | null> {
  try {
    return await authApi.me(request.headers.get("cookie"));
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return null;
    }
    throw error;
  }
}
