import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { ConsentModal } from "./ConsentModal";

const noop = async () => {};

function renderModal(recordConsent = vi.fn(async () => {})) {
  const signOut = vi.fn(async () => {});
  const auth = {
    session: { account: { uid: "u-ana" }, profile: null },
    loading: false,
    isAuthenticated: true,
    isVerified: true,
    isAdmin: false,
    isSuperAdmin: false,
    signInWithGoogle: noop,
    signOut,
    refresh: noop,
    saveProfile: noop,
    recordConsent,
    deleteAccount: noop,
  } as unknown as AuthContextValue;

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <ConsentModal />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { recordConsent, signOut };
}

describe("ConsentModal", () => {
  it("does not record a yes until the box is checked", async () => {
    const user = userEvent.setup();
    const { recordConsent } = renderModal();
    expect(
      screen.getByRole("button", { name: "Agree and continue" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Agree and continue" }));
    expect(recordConsent).not.toHaveBeenCalled();
  });

  it("records consent after a checked yes", async () => {
    const user = userEvent.setup();
    const { recordConsent } = renderModal();
    await user.click(screen.getByLabelText(/I am 18 or older/i));
    await user.click(screen.getByRole("button", { name: "Agree and continue" }));
    expect(recordConsent).toHaveBeenCalled();
  });
});
