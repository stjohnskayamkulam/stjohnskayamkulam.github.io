/**
 * These tests protect the two promises the directory makes to its members:
 * contact details never leak into list views, and unverified accounts are not
 * discoverable. Both are also enforced by Firestore rules; this suite catches a
 * regression in the app layer before it reaches a real database.
 */
import { describe, expect, it } from "vitest";
import { mockDataProvider, nextMilestoneReunion } from "./mockProvider";
import { seedPendingProfiles, seedProfiles } from "@/data/seed";

describe("listAlumni", () => {
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
    const pendingUids = seedPendingProfiles.map((p) => p.uid);
    expect(pendingUids.length).toBeGreaterThan(0);
    const returnedUids = new Set(rows.map((r) => r.uid));
    expect(pendingUids.filter((uid) => returnedUids.has(uid))).toEqual([]);
    expect(rows.every((r) => r.status === "verified")).toBe(true);
  });

  it("sorts by graduation year, newest class first", async () => {
    const rows = await mockDataProvider.listAlumni({});
    const years = rows.map((r) => r.gradYear);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
  });

  it("matches a free-text query against name, employer and location", async () => {
    const target = seedProfiles.find((p) => p.company)!;
    const rows = await mockDataProvider.listAlumni({
      query: target.company!.toLowerCase(),
    });
    expect(rows.map((r) => r.uid)).toContain(target.uid);
  });

  it("filters to a single graduating class", async () => {
    const year = seedProfiles[0].gradYear;
    const rows = await mockDataProvider.listAlumni({ gradYear: year });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.gradYear === year)).toBe(true);
  });

  it("filters to a decade inclusively at both ends", async () => {
    const rows = await mockDataProvider.listAlumni({ decade: 2000 });
    expect(rows.every((r) => r.gradYear >= 2000 && r.gradYear <= 2009)).toBe(
      true,
    );
  });

  it("combines filters conjunctively rather than as a union", async () => {
    const seed = seedProfiles.find((p) => p.country && p.gradYear)!;
    const rows = await mockDataProvider.listAlumni({
      country: seed.country,
      gradYear: seed.gradYear,
    });
    expect(
      rows.every(
        (r) => r.country === seed.country && r.gradYear === seed.gradYear,
      ),
    ).toBe(true);
  });

  it("honours the limit", async () => {
    const rows = await mockDataProvider.listAlumni({}, { limit: 3 });
    expect(rows).toHaveLength(3);
  });
});

describe("getClassInfo", () => {
  it("counts only verified classmates", async () => {
    const year = seedProfiles[0].gradYear;
    const info = await mockDataProvider.getClassInfo(year);
    const expected = seedProfiles.filter(
      (p) => p.gradYear === year && p.status === "verified",
    );
    expect(info.memberCount).toBe(expected.length);
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
  const now = (year: number) => new Date(year, 5, 1);

  it("returns the current year when the class is in its milestone year", () => {
    // 2026 is the Class of 2001's 25th year. Rounding up to 2031 would bury the
    // reunion during the months the class is planning it.
    expect(nextMilestoneReunion(2001, now(2026))).toBe(2026);
  });

  it("rounds up to the next interval between milestones", () => {
    expect(nextMilestoneReunion(2001, now(2027))).toBe(2031);
    expect(nextMilestoneReunion(2001, now(2030))).toBe(2031);
  });

  it("always lands on a five-year interval that has not passed", () => {
    for (let gradYear = 1970; gradYear <= 2026; gradYear += 1) {
      const reunion = nextMilestoneReunion(gradYear, now(2026))!;
      expect((reunion - gradYear) % 5).toBe(0);
      expect(reunion).toBeGreaterThanOrEqual(2026);
    }
  });

  it("gives a brand-new class its five-year reunion", () => {
    expect(nextMilestoneReunion(2026, now(2026))).toBe(2031);
  });
});

describe("event management", () => {
  const draft = {
    title: "30-Year Reunion — Class of 1996",
    description:
      "Dinner at the Riverside Club, followed by a tour of the new library.",
    date: "2027-11-20",
    startTime: "18:30",
    location: "Riverside Club",
    eventType: "reunion" as const,
    organizer: "Class of 1996 Committee",
    classYear: 1996,
    createdBy: "a-mariathomas",
  };

  it("creates an event that then appears in listings", async () => {
    const created = await mockDataProvider.createEvent(draft);
    expect(created.id).toBeTruthy();
    // A newly created event has nobody signed up yet, whatever the caller sent.
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
    expect(updated.id).toBe(created.id);

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
    const [event] = await mockDataProvider.listEvents({ limit: 1 });
    const before = event.attendeeCount;
    const attendee = {
      uid: "test-user",
      displayName: "Test Alumna",
      gradYear: 2005,
      rsvpAt: new Date().toISOString(),
    };

    await mockDataProvider.rsvp(event.id, attendee);
    await mockDataProvider.rsvp(event.id, attendee);
    expect((await mockDataProvider.getEvent(event.id))!.attendeeCount).toBe(
      before + 1,
    );

    await mockDataProvider.cancelRsvp(event.id, attendee.uid);
    await mockDataProvider.cancelRsvp(event.id, attendee.uid);
    expect((await mockDataProvider.getEvent(event.id))!.attendeeCount).toBe(
      before,
    );
  });
});

describe("membership", () => {
  it("promotes a pending applicant into the directory once verified", async () => {
    const applicant = seedPendingProfiles[0];

    const beforeRows = await mockDataProvider.listAlumni({});
    expect(beforeRows.map((r) => r.uid)).not.toContain(applicant.uid);

    await mockDataProvider.setMembershipStatus(applicant.uid, "verified");
    const afterRows = await mockDataProvider.listAlumni({});
    expect(afterRows.map((r) => r.uid)).toContain(applicant.uid);

    await mockDataProvider.setMembershipStatus(applicant.uid, "pending");
  });
});

/**
 * Access is granted by peers, not by signing up. These cases pin the three
 * ways that could go wrong: a single voucher being enough, one member voting
 * twice, and an applicant waving themselves through. The equivalent
 * constraints live in `firebase/firestore.rules`, which is what actually stops
 * a crafted request.
 *
 * The mock database is shared across the file, so each case uses an applicant
 * it does not have to reset afterwards.
 */
describe("peer approval", () => {
  const nikhil = "a-pending-nikhil";
  const grace = "a-pending-grace";
  const [maria, john] = ["a-mariathomas", "a-johnmathew"];

  it("refuses a self-approval", async () => {
    await expect(
      mockDataProvider.endorseMember(nikhil, nikhil),
    ).rejects.toThrow(/yourself/i);
  });

  it("does not let the same member count twice", async () => {
    // Maria already vouched for Grace in the seed data.
    const repeat = await mockDataProvider.endorseMember(grace, maria);

    expect(repeat.approvedBy).toEqual([maria]);
    expect(repeat.status).toBe("pending");
  });

  it("keeps an applicant out until two distinct members vouch", async () => {
    const first = await mockDataProvider.endorseMember(nikhil, maria);
    expect(first.approvedBy).toEqual([maria]);
    expect(first.status).toBe("pending");
    expect((await mockDataProvider.listAlumni({})).map((r) => r.uid)).not.toContain(
      nikhil,
    );

    const second = await mockDataProvider.endorseMember(nikhil, john);
    expect(second.approvedBy).toEqual([maria, john]);
    expect(second.status).toBe("verified");
    expect((await mockDataProvider.listAlumni({})).map((r) => r.uid)).toContain(
      nikhil,
    );
  });
});
