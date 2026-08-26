/**
 * The directory is also the class page now: selecting a graduating year has to
 * bring the class aggregates with it, and "My class" has to work for members
 * who have never recorded a year.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import {
  DEFAULT_FIELD_VISIBILITY,
  type AlumniProfile,
  type DirectoryEntry,
  type ClassInfo,
} from "@/types";
import { AlumniDirectoryPage } from "./AlumniDirectoryPage";
import {
  getClassInfo,
  getDirectoryFacets,
  listClassYears,
  searchAlumni,
} from "@/services/alumniService";
import { listEvents } from "@/services/eventService";

vi.mock("@/services/alumniService", () => ({
  getDirectoryFacets: vi.fn(),
  searchAlumni: vi.fn(),
  getClassInfo: vi.fn(),
  listClassYears: vi.fn(),
}));

vi.mock("@/services/eventService", () => ({ listEvents: vi.fn() }));

function entry(
  overrides: Partial<DirectoryEntry> & { uid: string },
): DirectoryEntry {
  return {
    firstName: "Test",
    lastName: "Person",
    fullName: "Test Person",
    searchName: "test person",
    gradYear: 2001,
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
    ...overrides,
  };
}

const classInfo: ClassInfo = {
  year: 2001,
  memberCount: 12,
  nextReunionYear: 2026,
  announcements: [
    {
      id: "a1",
      classYear: 2001,
      title: "Silver jubilee planning",
      body: "We are booking the hall.",
      postedBy: "u9",
      postedByName: "Reunion Committee",
      createdAt: "2024-01-01T00:00:00.000Z",
    },
  ],
};

const saveProfile = vi.fn(async () => {});

function renderPage(gradYear: number | null) {
  const profile = {
    ...entry({ uid: "me" }),
    email: "me@example.com",
  } as AlumniProfile;
  if (gradYear === null) delete (profile as Partial<AlumniProfile>).gradYear;
  else profile.gradYear = gradYear;

  const auth = {
    session: { account: { uid: "me" }, profile },
    loading: false,
    isAuthenticated: true,
    isVerified: true,
    isAdmin: false,
    saveProfile,
  } as unknown as AuthContextValue;

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/alumni"]}>
        <AlumniDirectoryPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.mocked(getDirectoryFacets).mockResolvedValue({
    gradYears: [2001, 1998],
    cities: [],
    countries: [],
    professions: [],
    industries: [],
    companies: [],
    batches: [],
  });
  vi.mocked(searchAlumni).mockResolvedValue([
    entry({ uid: "a", fullName: "Anita Raj" }),
  ]);
  vi.mocked(getClassInfo).mockResolvedValue(classInfo);
  vi.mocked(listClassYears).mockResolvedValue([
    { year: 2001, memberCount: 12 },
    { year: 1998, memberCount: 9 },
  ]);
  vi.mocked(listEvents).mockResolvedValue([]);
  saveProfile.mockClear();
});

describe("AlumniDirectoryPage", () => {
  it("shows no class context until a year is chosen", async () => {
    renderPage(2001);
    await screen.findByText("Anita Raj");

    expect(
      screen.queryByRole("heading", { name: "Class of 2001" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Silver jubilee planning"),
    ).not.toBeInTheDocument();
    expect(getClassInfo).not.toHaveBeenCalled();
  });

  it("filters to the member\u2019s own class and brings the class context with it", async () => {
    renderPage(2001);
    await userEvent.click(
      await screen.findByRole("button", { name: /my class/i }),
    );

    const banner = await screen.findByRole("region", { name: "Class of 2001" });
    // The banner is labelled as *mine*, not just any graduating class.
    expect(within(banner).getByText("My class")).toBeInTheDocument();
    expect(
      within(banner).getByText(/12 members on the network/),
    ).toBeInTheDocument();
    expect(
      within(banner).getByText(/Next milestone reunion: 2026/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Silver jubilee planning"),
    ).toBeInTheDocument();

    expect(vi.mocked(searchAlumni).mock.calls.at(-1)?.[0].gradYear).toBe(2001);
  });

  it("toggles the class filter back off", async () => {
    renderPage(2001);
    const button = await screen.findByRole("button", { name: /my class/i });

    await userEvent.click(button);
    expect(
      await screen.findByRole("heading", { name: "Class of 2001" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /my class/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Class of 2001" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("labels another year as a graduating class rather than my own", async () => {
    renderPage(1998);
    await userEvent.click(
      await screen.findByRole("button", { name: /my class/i }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /^2001/ }));

    const banner = await screen.findByRole("region", { name: "Class of 2001" });
    expect(within(banner).getByText("Graduating class")).toBeInTheDocument();
    expect(within(banner).queryByText("My class")).not.toBeInTheDocument();
  });

  it("lets a member without a class year set one, then filters by it", async () => {
    renderPage(null);
    await userEvent.click(
      await screen.findByRole("button", { name: /set my class year/i }),
    );

    await userEvent.selectOptions(
      screen.getByLabelText("Your graduating year"),
      "2001",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(saveProfile).toHaveBeenCalledWith({ gradYear: 2001 });
    expect(
      await screen.findByRole("heading", { name: "Class of 2001" }),
    ).toBeInTheDocument();
  });
});
