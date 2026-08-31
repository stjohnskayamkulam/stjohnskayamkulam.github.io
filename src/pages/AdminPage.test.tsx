import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { AdminPage } from "./AdminPage";
import { SUPERADMIN_EMAIL } from "@/config/admins";
import { setUserRole } from "@/services/adminService";
import { listEvents, updateEvent } from "@/services/eventService";

vi.mock("@/services/adminService", () => ({
  getAdminStats: vi.fn(async () => ({
    totalAlumni: 0,
    pendingApprovals: 0,
    upcomingEvents: 0,
    activeClasses: 0,
    newMembersThisMonth: 0,
  })),
  listAccounts: vi.fn(async () => [
    {
      uid: "u-superadmin",
      email: SUPERADMIN_EMAIL,
      displayName: "Jue George",
      role: "superadmin",
      status: "verified",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      uid: "u-ana",
      email: "ana@example.test",
      displayName: "Ana Nair",
      role: "member",
      status: "verified",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ]),
  setUserRole: vi.fn(async () => {}),
  approveMember: vi.fn(),
  rejectMember: vi.fn(),
}));

vi.mock("@/services/membershipService", () => ({
  listPendingApplicants: vi.fn(async () => []),
  approveApplicant: vi.fn(),
}));

vi.mock("@/services/eventService", () => ({
  listEvents: vi.fn(async () => []),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

vi.mock("@/services/alumniService", () => ({
  searchAlumni: vi.fn(async () => [
    {
      uid: "u-ana",
      fullName: "Ana Nair",
      gradYear: 2010,
      photoURL: null,
    },
  ]),
}));

const noop = async () => {};

function renderAdmin(isSuperAdmin: boolean) {
  const auth = {
    session: {
      account: {
        uid: "u-superadmin",
        email: SUPERADMIN_EMAIL,
        role: isSuperAdmin ? "superadmin" : "admin",
      },
      profile: null,
    },
    loading: false,
    isAuthenticated: true,
    isVerified: true,
    isAdmin: true,
    isSuperAdmin,
    signInWithGoogle: noop,
    signOut: noop,
    refresh: noop,
    saveProfile: noop,
  } as unknown as AuthContextValue;

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("AdminPage admin appointment", () => {
  beforeEach(() => {
    vi.mocked(setUserRole).mockClear();
    vi.mocked(listEvents).mockResolvedValue([]);
  });
  it("hides admin-appointment tools from an ordinary admin", async () => {
    const user = userEvent.setup();
    renderAdmin(false);
    expect(
      screen.queryByRole("button", { name: "Admins" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Members" }));
    expect(await screen.findByText("Ana Nair")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Edit profile" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Make admin" }),
    ).not.toBeInTheDocument();
  });

  it("lets the superadmin appoint a member from the Admins tab", async () => {
    const user = userEvent.setup();
    renderAdmin(true);

    await user.click(screen.getByRole("button", { name: "Admins" }));
    expect(await screen.findByText("Jue George")).toBeInTheDocument();
    expect(screen.getByText("Superadmin")).toBeInTheDocument();
    expect(screen.getByText("Ana Nair")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Make admin" }));
    expect(setUserRole).toHaveBeenCalledWith("u-ana", "admin");
  });

  it("lets the superadmin appoint from the members list", async () => {
    const user = userEvent.setup();
    renderAdmin(true);

    await user.click(screen.getByRole("button", { name: "Members" }));
    expect(
      await screen.findByRole("button", { name: "Make admin" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "href",
      "/alumni/u-ana/edit",
    );

    await user.click(screen.getByRole("button", { name: "Make admin" }));
    expect(setUserRole).toHaveBeenCalledWith("u-ana", "admin");
  });
});

describe("AdminPage events", () => {
  beforeEach(() => {
    vi.mocked(updateEvent).mockClear();
  });

  it("lets an admin save changes to an existing event", async () => {
    vi.mocked(listEvents).mockResolvedValue([
      {
        id: "e-reunion",
        title: "25-Year Reunion",
        description: "Come back to Peringala.",
        date: "2026-10-10",
        startTime: "18:00",
        location: "School ground",
        eventType: "reunion",
        organizer: "Alumni committee",
        attendeeCount: 3,
        createdBy: "u-admin",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    vi.mocked(updateEvent).mockResolvedValue({
      id: "e-reunion",
      title: "Silver jubilee",
      description: "Come back to Peringala.",
      date: "2026-10-10",
      startTime: "18:00",
      location: "School ground",
      eventType: "reunion",
      organizer: "Alumni committee",
      attendeeCount: 3,
      createdBy: "u-admin",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const user = userEvent.setup();
    renderAdmin(false);
    await user.click(screen.getByRole("button", { name: "Events" }));

    expect(await screen.findByText("25-Year Reunion")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Edit 25-Year Reunion" }),
    );

    const title = screen.getByLabelText(/^title/i);
    await user.clear(title);
    await user.type(title, "Silver jubilee");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateEvent).toHaveBeenCalledWith(
      "e-reunion",
      expect.objectContaining({
        title: "Silver jubilee",
        location: "School ground",
      }),
    );
  });
});
