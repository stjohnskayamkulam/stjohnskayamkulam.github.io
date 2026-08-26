/**
 * The client-side half of peer verification. Firestore rules are the real
 * boundary, but these helpers decide what a member is shown and offered, so a
 * mistake here either hides the directory from someone who earned access or
 * invites them to cast a vote that the server will reject.
 */
import { describe, expect, it } from "vitest";
import {
  approvalProgress,
  canApprove,
  isSessionVerified,
} from "./membershipService";
import { REQUIRED_APPROVALS } from "@/types";

const session = (
  account: { role?: string; status?: string; email?: string },
  profile?: { status?: string; approvedBy?: string[] } | null,
) => ({
  account: {
    role: account.role ?? "member",
    status: account.status ?? "pending",
    email: account.email,
  },
  profile:
    profile === null
      ? null
      : {
          status: profile?.status ?? "pending",
          approvedBy: profile?.approvedBy ?? [],
        },
});

describe("isSessionVerified", () => {
  it("keeps a fresh applicant out", () => {
    expect(isSessionVerified(session({}))).toBe(false);
  });

  it("keeps an applicant out one approval short", () => {
    const approvedBy = Array.from(
      { length: REQUIRED_APPROVALS - 1 },
      (_, i) => `voter-${i}`,
    );
    expect(isSessionVerified(session({}, { approvedBy }))).toBe(false);
  });

  it("lets an applicant in on the strength of the profile approvals alone", () => {
    // Approvers cannot write `users/{uid}`, so the account still says pending
    // at the moment the final approval lands.
    const approvedBy = Array.from(
      { length: REQUIRED_APPROVALS },
      (_, i) => `voter-${i}`,
    );
    expect(isSessionVerified(session({}, { approvedBy }))).toBe(true);
  });

  it("honours an admin verification that bypassed the queue", () => {
    expect(isSessionVerified(session({ status: "verified" }))).toBe(true);
  });

  it("never lets a rejected member back in on stale approvals", () => {
    const approvedBy = Array.from(
      { length: REQUIRED_APPROVALS },
      (_, i) => `voter-${i}`,
    );
    expect(
      isSessionVerified(session({ status: "rejected" }, { approvedBy })),
    ).toBe(false);
  });

  it("treats admins as verified", () => {
    expect(isSessionVerified(session({ role: "admin" }, null))).toBe(true);
  });

  it("treats superadmins as verified", () => {
    expect(isSessionVerified(session({ role: "superadmin" }, null))).toBe(true);
  });

  it("treats the bootstrap Google email as staff even before the role write", () => {
    expect(
      isSessionVerified(
        session({ email: "jue.george@gmail.com", status: "pending" }, null),
      ),
    ).toBe(true);
  });

  it("rejects a missing session", () => {
    expect(isSessionVerified(null)).toBe(false);
  });
});

describe("canApprove", () => {
  const applicant = { uid: "applicant", approvedBy: ["voter-a"] };

  it("refuses a self-approval", () => {
    expect(canApprove({ ...applicant, uid: "voter-b" }, "voter-b")).toBe(false);
  });

  it("refuses a second vote from the same member", () => {
    expect(canApprove(applicant, "voter-a")).toBe(false);
  });

  it("allows a member who has not voted yet", () => {
    expect(canApprove(applicant, "voter-b")).toBe(true);
  });

  it("refuses a signed-out viewer", () => {
    expect(canApprove(applicant, undefined)).toBe(false);
  });
});

describe("approvalProgress", () => {
  it("counts down the approvals still needed", () => {
    expect(approvalProgress({ approvedBy: [], status: "pending" })).toEqual({
      count: 0,
      remaining: REQUIRED_APPROVALS,
      complete: false,
    });
  });

  it("never reports a negative remainder", () => {
    const approvedBy = Array.from(
      { length: REQUIRED_APPROVALS + 2 },
      (_, i) => `voter-${i}`,
    );
    const progress = approvalProgress({ approvedBy, status: "verified" });
    expect(progress.remaining).toBe(0);
    expect(progress.complete).toBe(true);
  });
});
