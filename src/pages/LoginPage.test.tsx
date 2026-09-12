import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

const noop = async () => {};

function context(partial: Partial<AuthContextValue>): AuthContextValue {
  return {
    session: null,
    loading: false,
    isAuthenticated: false,
    isVerified: false,
    isAdmin: false,
    isSuperAdmin: false,
    signInWithGoogle: noop,
    signOut: noop,
    refresh: noop,
    saveProfile: noop,
    recordConsent: noop,
    deleteAccount: noop,
    ...partial,
  };
}

function renderAuthPage(page: "login" | "register", auth: AuthContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[`/${page}`]}>
        <Routes>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/profile" element={<p>Full profile page</p>} />
          <Route path="/alumni" element={<p>Directory</p>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("post-signin redirects", () => {
  it("does not dump a new member onto the full profile form", () => {
    renderAuthPage(
      "login",
      context({ isAuthenticated: true, isVerified: false }),
    );
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Full profile page")).not.toBeInTheDocument();
  });

  it("sends a verified member back to where they were going", () => {
    render(
      <AuthContext.Provider
        value={context({ isAuthenticated: true, isVerified: true })}
      >
        <MemoryRouter
          initialEntries={[{ pathname: "/login", state: { from: "/alumni" } }]}
        >
          <Routes>
            <Route path="/alumni" element={<p>Directory</p>} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText("Directory")).toBeInTheDocument();
  });

  it("keeps register from opening the optional profile form first", () => {
    renderAuthPage("register", context({ isAuthenticated: true }));
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Full profile page")).not.toBeInTheDocument();
  });
});

describe("join consent", () => {
  it("does not start Google sign-in until the notice is accepted", async () => {
    const user = userEvent.setup();
    const signInWithGoogle = vi.fn(async () => {});
    renderAuthPage(
      "register",
      context({ signInWithGoogle }),
    );
    const continueButton = screen.getByRole("button", {
      name: "Continue with Google",
    });
    expect(continueButton).toBeDisabled();
    await user.click(continueButton);
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });
});
