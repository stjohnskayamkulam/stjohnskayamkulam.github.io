import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { DEFAULT_FIELD_VISIBILITY, type AlumniProfile } from "@/types";
import { SUPERADMIN_EMAIL } from "@/config/admins";
import { ProfileEditPage } from "./ProfileEditPage";
import { getProfile, updateProfile } from "@/services/alumniService";

vi.mock("@/services/alumniService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/alumniService")>();
  return {
    ...actual,
    getProfile: vi.fn(),
    updateProfile: vi.fn(async (_uid: string, patch: Partial<AlumniProfile>) => ({
      ...ana,
      ...patch,
    })),
  };
});

vi.mock("@/data/geocode", () => ({
  geocodePlace: vi.fn(async () => [9.18, 76.5]),
}));

const ana: AlumniProfile = {
  uid: "u-ana",
  firstName: "Ana",
  lastName: "Nair",
  fullName: "Ana Nair",
  searchName: "ana nair",
  gradYear: 2010,
  yearsAttended: { from: "LKG", to: "12" },
  city: "Kayamkulam",
  country: "India",
  interests: [],
  activities: [],
  clubs: [],
  helpOffers: [],
  visibility: "alumni",
  fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
  status: "verified",
  approvedBy: [],
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

const noop = async () => {};

function renderEdit(uid: string) {
  const auth = {
    session: {
      account: {
        uid: "u-superadmin",
        email: SUPERADMIN_EMAIL,
        role: "superadmin",
      },
      profile: { ...ana, uid: "u-superadmin", firstName: "Jue", lastName: "George" },
    },
    loading: false,
    isAuthenticated: true,
    isVerified: true,
    isAdmin: true,
    isSuperAdmin: true,
    signInWithGoogle: noop,
    signOut: noop,
    refresh: noop,
    saveProfile: vi.fn(),
  } as unknown as AuthContextValue;

  vi.mocked(getProfile).mockResolvedValue(ana);

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[`/alumni/${uid}/edit`]}>
        <Routes>
          <Route path="/alumni/:uid/edit" element={<ProfileEditPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProfileEditPage as superadmin", () => {
  it("loads another alumnus and saves through updateProfile, not the session", async () => {
    const user = userEvent.setup();
    renderEdit("u-ana");

    expect(await screen.findByRole("heading", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.getByText(/Ana Nair/)).toBeInTheDocument();
    expect(
      screen.getByText(/editing this record as the network administrator/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/10th grade graduation year/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /regardless of when you joined or left St\. John's School/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/class \/ batch/i)).not.toBeInTheDocument();

    const city = screen.getByLabelText(/current city/i);
    await user.clear(city);
    await user.type(city, "Kochi");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(updateProfile).toHaveBeenCalledWith(
      "u-ana",
      expect.objectContaining({ city: "Kochi", country: "India" }),
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
