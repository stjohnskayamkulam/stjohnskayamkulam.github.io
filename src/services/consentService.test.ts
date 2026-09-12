import { describe, expect, it } from "vitest";
import { PRIVACY_NOTICE_VERSION } from "@/config/privacy";
import { hasCurrentConsent, sessionNeedsConsent } from "./consentService";
import type { UserAccount } from "@/types";

const account = (consent?: UserAccount["consent"]): UserAccount => ({
  uid: "u-1",
  email: "ana@example.test",
  displayName: "Ana",
  role: "member",
  status: "verified",
  createdAt: "2020-01-01T00:00:00.000Z",
  consent,
});

describe("sessionNeedsConsent", () => {
  it("does not interrupt visitors", () => {
    expect(sessionNeedsConsent(null)).toBe(false);
  });

  it("asks members who have never agreed", () => {
    expect(sessionNeedsConsent({ account: account() })).toBe(true);
    expect(hasCurrentConsent(account())).toBe(false);
  });

  it("accepts a yes recorded against the current notice", () => {
    const consented = account({
      givenAt: "2026-09-12T00:00:00.000Z",
      noticeVersion: PRIVACY_NOTICE_VERSION,
    });
    expect(sessionNeedsConsent({ account: consented })).toBe(false);
  });

  it("asks again when the notice version changes", () => {
    expect(
      hasCurrentConsent(
        account({
          givenAt: "2024-01-01T00:00:00.000Z",
          noticeVersion: "2019-01-01",
        }),
      ),
    ).toBe(false);
  });
});
