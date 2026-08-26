/**
 * Turns Firebase Auth / Firestore failures into something a person can act on.
 * Raw `auth/popup-closed-by-user` strings are accurate and useless.
 */
export function authErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "This address is not authorised for Google sign-in. Add it under Firebase Authentication → Settings → Authorised domains (localhost for local work, stjohnskayamkulam.github.io for the live site).";
    case "auth/operation-not-allowed":
      return "Google sign-in is switched off for this Firebase project. Enable it under Authentication → Sign-in method.";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked. Allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/cancelled-popup-request":
      return "Sign-in was interrupted. Please try again.";
    case "auth/network-request-failed":
      return "Network error during sign-in. Check your connection and try again.";
    case "auth/account-exists-with-different-credential":
      return "That Google account is already linked another way. Use the same Google account you signed up with.";
    case "permission-denied":
      return "Google accepted you, but Firestore refused to create the account. Deploy the latest firebase/firestore.rules to this project.";
    default:
      return err instanceof Error
        ? err.message
        : "Sign-in failed. Please try again.";
  }
}

/** Popup failures that a full-page Google redirect can recover from. */
export function shouldFallbackToRedirect(err: unknown): boolean {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  return (
    code === "auth/popup-blocked" ||
    code === "auth/internal-error" ||
    code === "auth/argument-error"
  );
}
