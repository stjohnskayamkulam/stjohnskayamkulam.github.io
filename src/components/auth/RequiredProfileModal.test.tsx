import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { DEFAULT_FIELD_VISIBILITY, type AlumniProfile } from "@/types";
import { RequiredProfileModal } from "./RequiredProfileModal";

vi.mock("@/data/geocode", () => ({
  geocodePlace: vi.fn(async () => [9.18, 76.5]),
}));

const incomplete: AlumniProfile = {
  uid: "u-new",
  firstName: "Jue",
  lastName: "",
  fullName: "Jue",
  searchName: "jue",
  gradYear: 0,
  interests: [],
  activities: [],
  clubs: [],
  helpOffers: [],
  visibility: "alumni",
  fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
  status: "pending",
  approvedBy: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const noop = async () => {};

function renderModal(saveProfile = vi.fn(async () => {})) {
  const signOut = vi.fn(async () => {});
  const auth = {
    session: { account: { uid: "u-new" }, profile: incomplete },
    loading: false,
    isAuthenticated: true,
    isVerified: false,
    isAdmin: false,
    isSuperAdmin: false,
    signInWithGoogle: noop,
    signOut,
    refresh: noop,
    saveProfile,
  } as unknown as AuthContextValue;

  render(
    <AuthContext.Provider value={auth}>
      <RequiredProfileModal />
    </AuthContext.Provider>,
  );
  return { saveProfile, signOut };
}

describe("RequiredProfileModal", () => {
  it("saves the required fields and leaves optional ones for later", async () => {
    const user = userEvent.setup();
    const { saveProfile } = renderModal();

    await user.type(screen.getByLabelText(/last name/i), "George");
    await user.type(
      screen.getByLabelText(/10th grade graduation year/i),
      "2001",
    );
    await user.selectOptions(screen.getByLabelText(/attended from/i), "LKG");
    await user.selectOptions(screen.getByLabelText(/attended until/i), "10");
    await user.type(screen.getByLabelText(/current city/i), "Kayamkulam");
    await user.type(screen.getByLabelText(/country/i), "India");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Jue",
        lastName: "George",
        gradYear: 2001,
        yearsAttended: { from: "LKG", to: "10" },
        city: "Kayamkulam",
        country: "India",
      }),
    );
  });

  it("lets the member sign out instead of filling the form", async () => {
    const user = userEvent.setup();
    const { signOut } = renderModal();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalled();
  });
});
