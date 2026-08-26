/** Authentication facade. Adds analytics; owns no state of its own. */
import { getAuthProvider } from "@/services";
import type { Session } from "@/services/providers/types";
import { track } from "@/utils/analytics";

export function subscribeToSession(
  listener: (session: Session | null) => void,
): () => void {
  let unsubscribe: (() => void) | undefined;
  let cancelled = false;

  void getAuthProvider().then((provider) => {
    if (cancelled) return;
    unsubscribe = provider.subscribe(listener);
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function signInWithGoogle(): Promise<Session> {
  const session = await (await getAuthProvider()).signInWithGoogle();
  track("login", { method: "google", status: session.account.status });
  return session;
}

export async function signOut(): Promise<void> {
  await (await getAuthProvider()).signOut();
  track("logout");
}

export async function refreshSession(): Promise<Session | null> {
  return (await getAuthProvider()).refresh();
}
