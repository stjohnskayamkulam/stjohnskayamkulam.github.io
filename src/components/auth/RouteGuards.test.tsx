/**
 * The guards decide which of the four membership tiers can reach which route.
 * A regression here would expose the directory to anyone who signs up, so each
 * tier is asserted explicitly rather than relying on a single happy path.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { RequireAdmin, RequireAuth, RequireVerified } from "./RouteGuards";

type Tier = "loading" | "anonymous" | "pending" | "verified" | "admin";

function contextFor(tier: Tier): AuthContextValue {
  const noop = async () => {};
  return {
    session: null,
    loading: tier === "loading",
    isAuthenticated:
      tier === "pending" || tier === "verified" || tier === "admin",
    isVerified: tier === "verified" || tier === "admin",
    isAdmin: tier === "admin",
    signInWithGoogle: noop,
    signInWithEmail: noop,
    register: noop,
    signOut: noop,
    refresh: noop,
    saveProfile: noop,
  };
}

function renderGuard(Guard: () => React.ReactElement, tier: Tier) {
  return render(
    <AuthContext.Provider value={contextFor(tier)}>
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/login" element={<p>Sign in page</p>} />
          <Route element={<Guard />}>
            <Route path="/protected" element={<p>Protected content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const protectedContent = () => screen.queryByText("Protected content");
const loginPage = () => screen.queryByText("Sign in page");

describe("RequireAuth", () => {
  it("waits for the session instead of bouncing to login", () => {
    renderGuard(RequireAuth, "loading");
    expect(loginPage()).not.toBeInTheDocument();
    expect(protectedContent()).not.toBeInTheDocument();
  });

  it("redirects an anonymous visitor to sign in", () => {
    renderGuard(RequireAuth, "anonymous");
    expect(loginPage()).toBeInTheDocument();
  });

  it("admits a signed-in member awaiting verification", () => {
    // Deliberate: /profile and /settings must be reachable while pending, so a
    // new registrant can fill in the details a verifier needs to approve them.
    renderGuard(RequireAuth, "pending");
    expect(protectedContent()).toBeInTheDocument();
  });
});

describe("RequireVerified", () => {
  it("redirects an anonymous visitor to sign in", () => {
    renderGuard(RequireVerified, "anonymous");
    expect(loginPage()).toBeInTheDocument();
  });

  it("blocks a pending member and explains why", () => {
    renderGuard(RequireVerified, "pending");
    expect(protectedContent()).not.toBeInTheDocument();
    expect(screen.getByText("Awaiting verification")).toBeInTheDocument();
  });

  it("admits a verified alumnus", () => {
    renderGuard(RequireVerified, "verified");
    expect(protectedContent()).toBeInTheDocument();
  });

  it("admits an admin", () => {
    renderGuard(RequireVerified, "admin");
    expect(protectedContent()).toBeInTheDocument();
  });
});

describe("RequireAdmin", () => {
  it("blocks a verified member who is not on the committee", () => {
    renderGuard(RequireAdmin, "verified");
    expect(protectedContent()).not.toBeInTheDocument();
    expect(screen.getByText("Administrators only")).toBeInTheDocument();
  });

  it("admits an admin", () => {
    renderGuard(RequireAdmin, "admin");
    expect(protectedContent()).toBeInTheDocument();
  });
});
