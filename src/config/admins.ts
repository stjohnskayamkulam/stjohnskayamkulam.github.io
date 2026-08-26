/**
 * Bootstrap administrators.
 *
 * The email is taken from the Google ID token (`request.auth.token.email`),
 * which a client cannot forge. Keep this list in step with
 * `isSuperAdmin()` in `firebase/firestore.rules`.
 */
export const SUPERADMIN_EMAIL = "jue.george@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === SUPERADMIN_EMAIL;
}

/** Committee access: stored role, or the bootstrap Google account. */
export function isStaffAccount(account: {
  role: string;
  email?: string | null;
}): boolean {
  return (
    account.role === "admin" ||
    account.role === "superadmin" ||
    isSuperAdminEmail(account.email)
  );
}
