import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { DEFAULT_FIELD_VISIBILITY, type AlumniProfile } from "@/types";
import { AppLayout } from "./AppLayout";

vi.mock("@/utils/analytics", () => ({
  track: () => {},
}));

const complete: AlumniProfile = {
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

function renderLayout(
  profile: AlumniProfile | null,
  path = "/",
) {
  const auth = {
    session: profile
      ? {
          account: {
            uid: profile.uid,
            displayName: profile.fullName,
            status: profile.status,
          },
          profile,
        }
      : null,
    loading: false,
    isAuthenticated: Boolean(profile),
    isVerified: profile?.status === "verified",
    isAdmin: false,
    isSuperAdmin: false,
    signInWithGoogle: noop,
    signOut: noop,
    refresh: noop,
    saveProfile: noop,
  } as unknown as AuthContextValue;

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<p>Home page</p>} />
            <Route path="alumni" element={<p>Directory page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("AppLayout required profile gate", () => {
  it("blocks the site when required fields are missing after sign-in", () => {
    renderLayout({
      ...complete,
      lastName: "",
      city: undefined,
      country: undefined,
      yearsAttended: undefined,
      gradYear: 0,
    });
    expect(
      screen.getByRole("dialog", { name: "Complete your required details" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });

  it("does not interrupt a member whose required fields are already in", () => {
    renderLayout(complete);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("does not show the modal to visitors who have not signed in", () => {
    renderLayout(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("also blocks a returning member who never filled classes attended", () => {
    renderLayout({ ...complete, yearsAttended: undefined }, "/alumni");
    expect(
      screen.getByRole("dialog", { name: "Complete your required details" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Directory page")).not.toBeInTheDocument();
  });

  it("blocks a member tagged with graduation year 0", () => {
    renderLayout({ ...complete, gradYear: 0 });
    expect(
      screen.getByRole("dialog", { name: "Complete your required details" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });
});
