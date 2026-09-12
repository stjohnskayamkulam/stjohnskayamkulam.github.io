import { PRIVACY_NOTICE_VERSION } from "@/config/privacy";
import { getAuthProvider } from "@/services";
import type { Session } from "@/services/providers/types";
import type { UserAccount } from "@/types";
import { track } from "@/utils/analytics";

export function hasCurrentConsent(
  account: UserAccount | null | undefined,
): boolean {
  return (
    account?.consent?.noticeVersion === PRIVACY_NOTICE_VERSION &&
    Boolean(account.consent.givenAt)
  );
}

/** Signed-in members who have not yet agreed to the current notice. */
export function sessionNeedsConsent(
  session: { account: UserAccount } | null | undefined,
): boolean {
  return Boolean(session) && !hasCurrentConsent(session?.account);
}

export async function recordConsent(): Promise<Session> {
  const session = await (await getAuthProvider()).recordConsent();
  track("consent_given", {
    noticeVersion: session.account.consent?.noticeVersion,
  });
  return session;
}

export async function deleteAccount(): Promise<void> {
  await (await getAuthProvider()).deleteAccount();
  track("account_deleted");
}
