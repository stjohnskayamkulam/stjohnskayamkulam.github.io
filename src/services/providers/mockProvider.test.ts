/**
 * These tests protect the two promises the directory makes to its members:
 * contact details never leak into list views, and unverified accounts are not
 * discoverable. Fixtures are local to this file — the app ships with no dummy
 * alumni.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  mockDataProvider,
  nextMilestoneReunion,
  putMockMember,
  resetMockStore,
} from "./mockProvider";
import {
  DEFAULT_FIELD_VISIBILITY,
  type AlumniProfile,
  type UserAccount,
} from "@/types";

const now = "2026-01-01T00:00:00.000Z";

function member(
  uid: string,
  overrides: Partial<AlumniProfile> &
    Pick<AlumniProfile, "firstName" | "lastName" | "gradYear">,
): { account: UserAccount; profile: AlumniProfile } {
  const fullName = `${overrides.firstName} ${overrides.lastName}`;
  const status = overrides.status ?? "verified";
  const profile: AlumniProfile = {
    uid,
    fullName,
    searchName: fullName.toLowerCase(),
    interests: [],
    activities: [],
    clubs: [],
    helpOffers: [],
    visibility: "alumni",
    fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
    approvedBy: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
    status,
  };
  const account: UserAccount = {
    uid,
    email: profile.email ?? `${uid}@example.test`,
    displayName: fullName,
    role: "member",
    status,
    createdAt: now,
  };
  return { account, profile };
}

function installDirectory() {
  const ana = member("u-ana", {
    firstName: "Ana",
    lastName: "Nair",
    gradYear: 2010,
    company: "Trellis",
    country: "India",
    city: "Kochi",
  });
  const ben = member("u-ben", {
    firstName: "Ben",
    lastName: "Thomas",
    gradYear: 2001,
    company: "Harbour",
    country: "Australia",
    city: "Melbourne",
  });
  const pending = member("u-pending", {
    firstName: "Pat",
    lastName: "Pending",
    gradYear: 2008,
    status: "pending",
    country: "India",
  });
  putMockMember(ana.account, ana.profile);
  putMockMember(ben.account, ben.profile);
  putMockMember(pending.account, pending.profile);
}

beforeEach(() => {
  resetMockStore();
});

describe("listAlumni", () => {
  beforeEach(installDirectory);

  it("never includes contact details", async () => {
    const rows = await mockDataProvider.listAlumni({});
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).not.toHaveProperty("email");
      expect(row).not.toHaveProperty("phone");
    }
  });

  it("excludes members who have not been verified", async () => {
    const rows = await mockDataProvider.listAlumni({});
    expect(rows.map((r) => r.uid)).not.toContain("u-pending");
    expect(rows.every((r) => r.status === "verified")).toBe(true);
  });

  it("sorts by graduation year, newest class first", async () => {
    const rows = await mockDataProvider.listAlumni({});
    const years = rows.map((r) => r.gradYear);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
  });

  it("matches a free-text query against name, employer and location", async () => {
    const rows = await mockDataProvider.listAlumni({ query: "trellis" });
    expect(rows.map((r) => r.uid)).toContain("u-ana");
  });

  it("filters to a single graduating class", async () => {
    const rows = await mockDataProvider.listAlumni({ gradYear: 2001 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.gradYear === 2001)).toBe(true);
  });

  it("filters to a decade inclusively at both ends", async () => {
    const rows = await mockDataProvider.listAlumni({ decade: 2000 });
    expect(rows.every((r) => r.gradYear >= 2000 && r.gradYear <= 2009)).toBe(
      true,
    );
  });

  it("combines filters conjunctively rather than as a union", async () => {
    const rows = await mockDataProvider.listAlumni({
      country: "India",
      gradYear: 2010,
    });
    expect(
      rows.every((r) => r.country === "India" && r.gradYear === 2010),
    ).toBe(true);
    expect(rows.map((r) => r.uid)).toContain("u-ana");
  });

  it("honours the limit", async () => {
    const rows = await mockDataProvider.listAlumni({}, { limit: 1 });
    expect(rows).toHaveLength(1);
  });
});

describe("getClassInfo", () => {
  beforeEach(installDirectory);

  it("counts only verified classmates", async () => {
    const info = await mockDataProvider.getClassInfo(2010);
    expect(info.memberCount).toBe(1);
  });

  it("projects the next five-year reunion", async () => {
    const info = await mockDataProvider.getClassInfo(2001);
    expect(info.nextReunionYear).toBeDefined();
    expect((info.nextReunionYear! - 2001) % 5).toBe(0);
    expect(info.nextReunionYear!).toBeGreaterThanOrEqual(
      new Date().getFullYear(),
    );
  });
});

describe("nextMilestoneReunion", () => {
  const at = (year: number) => new Date(year, 5, 1);

  it("returns the current year when the class is in its milestone year", () => {
    expect(nextMilestoneReunion(2001, at(2026))).toBe(2026);
  });

  it("rounds up to the next interval between milestones", () => {
    expect(nextMilestoneReunion(2001, at(2027))).toBe(2031);
    expect(nextMilestoneReunion(2001, at(2030))).toBe(2031);
  });

  it("always lands on a five-year interval that has not passed", () => {
    for (let gradYear = 1970; gradYear <= 2026; gradYear += 1) {
      const reunion = nextMilestoneReunion(gradYear, at(2026))!;
      expect((reunion - gradYear) % 5).toBe(0);
      expect(reunion).toBeGreaterThanOrEqual(2026);
    }
  });

  it("gives a brand-new class its five-year reunion", () => {
    expect(nextMilestoneReunion(2026, at(2026))).toBe(2031);
  });
});

describe("event management", () => {
  const draft = {
    title: "30-Year Reunion — Class of 1996",
    description: "Dinner at the Riverside Club.",
    date: "2027-11-20",
    startTime: "18:30",
    location: "Riverside Club",
    eventType: "reunion" as const,
    organizer: "Class of 1996 Committee",
    classYear: 1996,
    createdBy: "u-ana",
  };

  it("creates an event that then appears in listings", async () => {
    const created = await mockDataProvider.createEvent(draft);
    expect(created.id).toBeTruthy();
    expect(created.attendeeCount).toBe(0);
    const all = await mockDataProvider.listEvents();
    expect(all.map((e) => e.id)).toContain(created.id);
    await mockDataProvider.deleteEvent(created.id);
  });

  it("scopes a class event to its graduating year", async () => {
    const created = await mockDataProvider.createEvent(draft);
    const forClass = await mockDataProvider.listEvents({ classYear: 1996 });
    expect(forClass.map((e) => e.id)).toContain(created.id);
    const otherClass = await mockDataProvider.listEvents({ classYear: 1997 });
    expect(otherClass.map((e) => e.id)).not.toContain(created.id);
    await mockDataProvider.deleteEvent(created.id);
  });

  it("updates an existing event", async () => {
    const created = await mockDataProvider.createEvent(draft);
    const updated = await mockDataProvider.updateEvent(created.id, {
      location: "School Hall",
    });
    expect(updated.location).toBe("School Hall");
    await mockDataProvider.deleteEvent(created.id);
  });

  it("deletes an event and its RSVPs", async () => {
    const created = await mockDataProvider.createEvent(draft);
    await mockDataProvider.rsvp(created.id, {
      uid: "test-user",
      displayName: "Test Alumna",
      gradYear: 1996,
      rsvpAt: new Date().toISOString(),
    });
    await mockDataProvider.deleteEvent(created.id);
    expect(await mockDataProvider.getEvent(created.id)).toBeNull();
    expect(await mockDataProvider.listAttendees(created.id)).toEqual([]);
  });

  it("refuses an RSVP once the event is full", async () => {
    const created = await mockDataProvider.createEvent({
      ...draft,
      capacity: 1,
    });
    await mockDataProvider.rsvp(created.id, {
      uid: "first",
      displayName: "First",
      gradYear: 1996,
      rsvpAt: new Date().toISOString(),
    });
    await expect(
      mockDataProvider.rsvp(created.id, {
        uid: "second",
        displayName: "Second",
        gradYear: 1996,
        rsvpAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(/capacity/i);
    await mockDataProvider.deleteEvent(created.id);
  });
});

describe("RSVP", () => {
  it("increments and decrements the attendee count, ignoring duplicates", async () => {
    const event = await mockDataProvider.createEvent({
      title: "Meetup",
      description: "",
      date: "2027-01-01",
      startTime: "18:00",
      location: "Hall",
      eventType: "networking",
      organizer: "Committee",
      createdBy: "u-ana",
    });
    const attendee = {
      uid: "test-user",
      displayName: "Test Alumna",
      gradYear: 2005,
      rsvpAt: new Date().toISOString(),
    };

    await mockDataProvider.rsvp(event.id, attendee);
    await mockDataProvider.rsvp(event.id, attendee);
    expect((await mockDataProvider.getEvent(event.id))!.attendeeCount).toBe(1);

    await mockDataProvider.cancelRsvp(event.id, attendee.uid);
    await mockDataProvider.cancelRsvp(event.id, attendee.uid);
    expect((await mockDataProvider.getEvent(event.id))!.attendeeCount).toBe(0);
  });
});

describe("membership", () => {
  beforeEach(installDirectory);

  it("promotes a pending applicant into the directory once verified", async () => {
    expect((await mockDataProvider.listAlumni({})).map((r) => r.uid)).not.toContain(
      "u-pending",
    );
    await mockDataProvider.setMembershipStatus("u-pending", "verified");
    expect((await mockDataProvider.listAlumni({})).map((r) => r.uid)).toContain(
      "u-pending",
    );
  });
});

describe("peer approval", () => {
  beforeEach(() => {
    installDirectory();
    const grace = member("u-grace", {
      firstName: "Grace",
      lastName: "Philip",
      gradYear: 2013,
      status: "pending",
      approvedBy: ["u-ana"],
    });
    putMockMember(grace.account, grace.profile);
  });

  it("refuses a self-approval", async () => {
    await expect(
      mockDataProvider.endorseMember("u-pending", "u-pending"),
    ).rejects.toThrow(/yourself/i);
  });

  it("does not let the same member count twice", async () => {
    const repeat = await mockDataProvider.endorseMember("u-grace", "u-ana");
    expect(repeat.approvedBy).toEqual(["u-ana"]);
    expect(repeat.status).toBe("pending");
  });

  it("keeps an applicant out until two distinct members vouch", async () => {
    const first = await mockDataProvider.endorseMember("u-pending", "u-ana");
    expect(first.status).toBe("pending");
    expect((await mockDataProvider.listAlumni({})).map((r) => r.uid)).not.toContain(
      "u-pending",
    );

    const second = await mockDataProvider.endorseMember("u-pending", "u-ben");
    expect(second.approvedBy).toEqual(["u-ana", "u-ben"]);
    expect(second.status).toBe("verified");
    expect((await mockDataProvider.listAlumni({})).map((r) => r.uid)).toContain(
      "u-pending",
    );
  });
});

describe("setUserRole", () => {
  beforeEach(() => {
    resetMockStore();
    installDirectory();
  });

  it("promotes a member to admin and verifies them if they were pending", async () => {
    await mockDataProvider.setUserRole("u-pending", "admin");

    const accounts = await mockDataProvider.listAccounts();
    const promoted = accounts.find((row) => row.uid === "u-pending");
    expect(promoted?.role).toBe("admin");
    expect(promoted?.status).toBe("verified");
    expect((await mockDataProvider.getProfile("u-pending"))?.status).toBe(
      "verified",
    );
  });

  it("revokes admin access without stripping membership", async () => {
    const ana = member("u-ana", {
      firstName: "Ana",
      lastName: "Nair",
      gradYear: 2010,
    });
    putMockMember({ ...ana.account, role: "admin" }, ana.profile);

    await mockDataProvider.setUserRole("u-ana", "member");

    const accounts = await mockDataProvider.listAccounts();
    expect(accounts.find((row) => row.uid === "u-ana")?.role).toBe("member");
    expect((await mockDataProvider.getProfile("u-ana"))?.status).toBe(
      "verified",
    );
  });

  it("refuses to change the bootstrap superadmin", async () => {
    const { SUPERADMIN_EMAIL } = await import("@/config/admins");
    const staff = member("u-superadmin", {
      firstName: "Super",
      lastName: "Admin",
      gradYear: 2001,
      email: SUPERADMIN_EMAIL,
    });
    putMockMember(
      { ...staff.account, role: "superadmin", email: SUPERADMIN_EMAIL },
      staff.profile,
    );

    await expect(
      mockDataProvider.setUserRole("u-superadmin", "member"),
    ).rejects.toThrow(/cannot be changed/i);
  });
});

describe("class years", () => {
  it("omits placeholder graduation year 0 from class lists and counts", async () => {
    const known = member("u-ana", {
      firstName: "Ana",
      lastName: "Nair",
      gradYear: 2010,
      country: "India",
    });
    const unset = member("u-new", {
      firstName: "New",
      lastName: "Member",
      gradYear: 0,
      country: "India",
    });
    putMockMember(known.account, known.profile);
    putMockMember(unset.account, unset.profile);

    expect(await mockDataProvider.listClassYears()).toEqual([
      { year: 2010, memberCount: 1 },
    ]);
    expect((await mockDataProvider.getDirectoryFacets()).gradYears).toEqual([
      2010,
    ]);
    expect((await mockDataProvider.getCommunityStats()).classCount).toBe(1);
  });
});
