/**
 * Administration.
 *
 * Note that none of this is a security boundary — it is convenience for people
 * who already hold the admin role. Firestore rules decide what actually
 * succeeds; see `firebase/firestore.rules`.
 */
import { getDataProvider } from "@/services";
import type {
  AdminStats,
  AlumniProfile,
  MembershipStatus,
  UserAccount,
} from "@/types";
import { track } from "@/utils/analytics";

export async function getAdminStats(): Promise<AdminStats> {
  return (await getDataProvider()).getAdminStats();
}

export async function listMembersByStatus(
  status: MembershipStatus,
): Promise<AlumniProfile[]> {
  return (await getDataProvider()).listMembersByStatus(status);
}

export async function approveMember(uid: string): Promise<void> {
  await (await getDataProvider()).setMembershipStatus(uid, "verified");
  track("admin_action", { action: "member_approved", uid });
}

export async function rejectMember(uid: string, note?: string): Promise<void> {
  await (await getDataProvider()).setMembershipStatus(uid, "rejected", note);
  track("admin_action", { action: "member_rejected", uid });
}

export async function listAccounts(): Promise<UserAccount[]> {
  return (await getDataProvider()).listAccounts();
}

/**
 * Appoints or revokes an ordinary admin. Only the bootstrap superadmin can
 * succeed at this write — Firestore refuses it for everyone else.
 */
export async function setUserRole(
  uid: string,
  role: "member" | "admin",
): Promise<void> {
  await (await getDataProvider()).setUserRole(uid, role);
  track("admin_action", {
    action: role === "admin" ? "admin_granted" : "admin_revoked",
    uid,
  });
}
