/** Miroir de l'énumération SQL woor.app_role. */
export const APP_ROLES = ["seller", "courier", "arbiter", "admin", "buyer", "system"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Rôles qui ont un compte. L'acheteur n'en a pas : il est identifié par son appareil. */
export type AccountRole = Exclude<AppRole, "buyer" | "system">;

/** Rôles de l'équipe Wóor, soumis à une session courte et à la passkey redemandée. */
export const STAFF_ROLES = ["arbiter", "admin"] as const satisfies readonly AppRole[];

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: AppRole): role is StaffRole {
  return (STAFF_ROLES as readonly AppRole[]).includes(role);
}
