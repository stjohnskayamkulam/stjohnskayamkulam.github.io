/**
 * Peer verification.
 *
 * Access to the directory is not granted by a single gatekeeper. An applicant
 * stays pending until `REQUIRED_APPROVALS` distinct existing members vouch for
 * them, at which point they are verified automatically.
 *
 * As always, this module is convenience rather than a security boundary — the
 * matching constraints live in `firebase/firestore.rules`.
 */
import { getDataProvider } from "@/services";
import { isStaffAccount } from "@/config/admins";
import { REQUIRED_APPROVALS, type AlumniProfile } from "@/types";
import { track } from "@/utils/analytics";

/** Applicants still collecting approvals, newest first. */
export async function listPendingApplicants(): Promise<AlumniProfile[]> {
  return (await getDataProvider()).listMembersByStatus("pending");
}

/**
 * Vouch for an applicant. Verifies them if this is the approval that reaches
 * the threshold. Approving yourself, or the same applicant twice, is refused.
 */
export async function approveApplicant(
  uid: string,
  approverUid: string,
): Promise<AlumniProfile> {
  const profile = await (
    await getDataProvider()
  ).endorseMember(uid, approverUid);
  track("member_approved", {
    uid,
    approvals: profile.approvedBy.length,
    verified: profile.status === "verified",
  });
  return profile;
}

/** How far along an applicant is, for progress copy and meters. */
export function approvalProgress(profile: {
  approvedBy: string[];
  status: string;
}): { count: number; remaining: number; complete: boolean } {
  const count = profile.approvedBy.length;
  return {
    count,
    remaining: Math.max(0, REQUIRED_APPROVALS - count),
    complete: profile.status === "verified" || count >= REQUIRED_APPROVALS,
  };
}

/**
 * Whether a session has earned directory access.
 *
 * An approver can only write the applicant's profile document — they have no
 * rights over the private `users/{uid}` record — so a freshly completed set of
 * approvals shows up on the profile first. Reading both keeps the client in
 * step with what Firestore rules will actually allow.
 */
export function isSessionVerified(
  session: {
    account: { role: string; status: string; email?: string | null };
    profile: { status: string; approvedBy: string[] } | null;
  } | null,
): boolean {
  if (!session) return false;
  if (isStaffAccount(session.account)) return true;
  if (session.account.status === "rejected") return false;
  if (session.account.status === "verified") return true;
  if (!session.profile) return false;
  return (
    session.profile.status === "verified" ||
    session.profile.approvedBy.length >= REQUIRED_APPROVALS
  );
}

/** Whether `approverUid` is still able to vouch for this applicant. */
export function canApprove(
  profile: { uid: string; approvedBy: string[] },
  approverUid: string | undefined,
): boolean {
  if (!approverUid) return false;
  if (profile.uid === approverUid) return false;
  return !profile.approvedBy.includes(approverUid);
}
