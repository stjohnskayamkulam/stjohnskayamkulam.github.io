import { describe, expect, it } from "vitest";
import { authErrorMessage, shouldFallbackToRedirect } from "./authErrors";

describe("authErrorMessage", () => {
  it("explains an unauthorised domain rather than echoing the SDK code", () => {
    expect(
      authErrorMessage({ code: "auth/unauthorized-domain", message: "x" }),
    ).toMatch(/Authorised domains/i);
  });

  it("treats a closed popup as a cancellation, not a failure", () => {
    expect(
      authErrorMessage({ code: "auth/popup-closed-by-user", message: "x" }),
    ).toMatch(/cancelled/i);
  });

  it("points at missing Firestore rules when the account write is denied", () => {
    expect(
      authErrorMessage({ code: "permission-denied", message: "x" }),
    ).toMatch(/firestore\.rules/i);
  });
});

describe("shouldFallbackToRedirect", () => {
  it("falls back when the popup never opened", () => {
    expect(shouldFallbackToRedirect({ code: "auth/popup-blocked" })).toBe(true);
    expect(shouldFallbackToRedirect({ code: "auth/popup-closed-by-user" })).toBe(
      false,
    );
  });
});
