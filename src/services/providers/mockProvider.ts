/**
 * In-memory backend backed by the seed data.
 *
 * Used whenever Firebase credentials are absent, which keeps `npm run dev`
 * working on a fresh clone and lets CI build and test without secrets.
 * Mutations live for the lifetime of the tab; only the signed-in user id is
 * persisted, so a refresh does not log you out mid-demo.
 */
import {
  seedClassAnnouncements,
  seedEvents,
  seedPendingProfiles,
  seedProfiles,
  seedUsers,
} from "@/data/seed";
import { REQUIRED_APPROVALS } from "@/types";
import type {
  AdminStats,
  AlumniFilters,
  AlumniProfile,
  ClassInfo,
  CommunityStats,
  DirectoryEntry,
  EventAttendee,
  MembershipStatus,
  SchoolEvent,
} from "@/types";
import { isUpcoming } from "@/utils/date";
import type {
  AuthProvider,
  DataProvider,
  DirectoryFacets,
  Session,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

const clone = <T>(value: T): T => structuredClone(value);

const db = {
  accounts: clone(seedUsers),
  profiles: [...clone(seedProfiles), ...clone(seedPendingProfiles)],
  events: clone(seedEvents),
  attendees: new Map<string, EventAttendee[]>(),
  classAnnouncements: clone(seedClassAnnouncements),
};

/** Simulated latency keeps loading states honest during development. */
const LATENCY_MS = 120;
function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(clone(value)), LATENCY_MS),
  );
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const stripContact = (p: AlumniProfile): DirectoryEntry => {
  const { email: _email, phone: _phone, ...rest } = p;
  return rest;
};

const verified = () => db.profiles.filter((p) => p.status === "verified");

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

const SESSION_KEY = "alumni.mock.uid";

function readStoredUid(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeStoredUid(uid: string | null): void {
  try {
    if (uid) localStorage.setItem(SESSION_KEY, uid);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private browsing modes can reject storage; the session simply won't persist.
  }
}

function buildSession(uid: string): Session | null {
  const account = db.accounts.find((a) => a.uid === uid);
  if (!account) return null;
  const profile = db.profiles.find((p) => p.uid === uid) ?? null;
  return clone({ account, profile });
}

const listeners = new Set<(session: Session | null) => void>();
let current: Session | null = null;

function emit(session: Session | null): void {
  current = session;
  for (const listener of listeners) listener(session ? clone(session) : null);
}

export const mockAuthProvider: AuthProvider = {
  subscribe(listener) {
    listeners.add(listener);
    // Resolve the stored session asynchronously to mirror Firebase's behaviour,
    // so consumers always see one "loading" tick first.
    queueMicrotask(() => {
      if (current === null) {
        const uid = readStoredUid();
        current = uid ? buildSession(uid) : null;
      }
      listener(current ? clone(current) : null);
    });
    return () => listeners.delete(listener);
  },

  async signInWithGoogle() {
    // Demo mode signs in as an administrator so every screen is reachable.
    const session = buildSession("a-mariathomas");
    if (!session) throw new Error("Demo account unavailable");
    writeStoredUid(session.account.uid);
    emit(session);
    return session;
  },

  async signOut() {
    writeStoredUid(null);
    emit(null);
  },

  async refresh() {
    const uid = current?.account.uid ?? readStoredUid();
    const session = uid ? buildSession(uid) : null;
    emit(session);
    return session;
  },
};

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

function matchesFilters(p: AlumniProfile, f: AlumniFilters): boolean {
  const q = f.query?.trim().toLowerCase();
  if (q) {
    const haystack = [
      p.fullName,
      p.company,
      p.profession,
      p.city,
      p.country,
      p.industry,
      p.batch,
      String(p.gradYear),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (f.gradYear && p.gradYear !== f.gradYear) return false;
  if (f.decade && (p.gradYear < f.decade || p.gradYear > f.decade + 9))
    return false;
  if (f.batch && p.batch !== f.batch) return false;
  if (f.city && p.city !== f.city) return false;
  if (f.country && p.country !== f.country) return false;
  if (f.profession && p.profession !== f.profession) return false;
  if (f.industry && p.industry !== f.industry) return false;
  if (f.company && p.company !== f.company) return false;
  if (f.helpOffer && !p.helpOffers.includes(f.helpOffer)) return false;
  return true;
}

const uniqueSorted = (values: (string | undefined)[]): string[] =>
  [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b),
  );

export const mockDataProvider: DataProvider = {
  /* Alumni ---------------------------------------------------------------- */

  async listAlumni(filters, options) {
    const rows = verified()
      .filter((p) => matchesFilters(p, filters))
      .sort(
        (a, b) =>
          b.gradYear - a.gradYear || a.fullName.localeCompare(b.fullName),
      )
      .map(stripContact);
    return settle(options?.limit ? rows.slice(0, options.limit) : rows);
  },

  async getProfile(uid) {
    return settle(db.profiles.find((p) => p.uid === uid) ?? null);
  },

  async updateProfile(uid, patch) {
    const index = db.profiles.findIndex((p) => p.uid === uid);
    if (index === -1) throw new Error("Profile not found");
    const next: AlumniProfile = {
      ...db.profiles[index],
      ...patch,
      uid,
      updatedAt: new Date().toISOString(),
    };
    next.fullName = `${next.firstName} ${next.lastName}`.trim();
    next.searchName = next.fullName.toLowerCase();
    db.profiles[index] = next;

    const account = db.accounts.find((a) => a.uid === uid);
    if (account) account.displayName = next.fullName;
    if (current?.account.uid === uid) emit(buildSession(uid));
    return settle(next);
  },

  async getDirectoryFacets() {
    const rows = verified();
    const facets: DirectoryFacets = {
      gradYears: [...new Set(rows.map((p) => p.gradYear))].sort(
        (a, b) => b - a,
      ),
      cities: uniqueSorted(rows.map((p) => p.city)),
      countries: uniqueSorted(rows.map((p) => p.country)),
      professions: uniqueSorted(rows.map((p) => p.profession)),
      industries: uniqueSorted(rows.map((p) => p.industry)),
      companies: uniqueSorted(rows.map((p) => p.company)),
      batches: uniqueSorted(rows.map((p) => p.batch)),
    };
    return settle(facets);
  },

  /* Classes --------------------------------------------------------------- */

  async getClassInfo(year) {
    const members = verified().filter((p) => p.gradYear === year);
    const info: ClassInfo = {
      year,
      memberCount: members.length,
      nextReunionYear: nextMilestoneReunion(year),
      announcements: db.classAnnouncements.filter((a) => a.classYear === year),
    };
    return settle(info);
  },

  async listClassMembers(year) {
    const rows = verified()
      .filter((p) => p.gradYear === year)
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(stripContact);
    return settle(rows);
  },

  async listClassAnnouncements(year) {
    const rows = db.classAnnouncements
      .filter((a) => a.classYear === year)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return settle(rows);
  },

  async listClassYears() {
    const counts = new Map<number, number>();
    for (const p of verified())
      counts.set(p.gradYear, (counts.get(p.gradYear) ?? 0) + 1);
    const rows = [...counts.entries()]
      .map(([year, memberCount]) => ({ year, memberCount }))
      .sort((a, b) => b.year - a.year);
    return settle(rows);
  },

  /* Events ---------------------------------------------------------------- */

  async listEvents(options) {
    let rows = [...db.events];
    if (options?.upcomingOnly) rows = rows.filter((e) => isUpcoming(e.date));
    if (options?.classYear != null)
      rows = rows.filter((e) => e.classYear === options.classYear);
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return settle(options?.limit ? rows.slice(0, options.limit) : rows);
  },

  async getEvent(id) {
    return settle(db.events.find((e) => e.id === id) ?? null);
  },

  async listAttendees(eventId) {
    return settle(db.attendees.get(eventId) ?? []);
  },

  async rsvp(eventId, attendee) {
    const event = db.events.find((e) => e.id === eventId);
    if (!event) throw new Error("Event not found");
    const list = db.attendees.get(eventId) ?? [];
    if (list.some((a) => a.uid === attendee.uid)) return settle(undefined);
    if (event.capacity != null && event.attendeeCount >= event.capacity) {
      throw new Error("This event is already at capacity.");
    }
    db.attendees.set(eventId, [...list, attendee]);
    event.attendeeCount += 1;
    return settle(undefined);
  },

  async cancelRsvp(eventId, uid) {
    const event = db.events.find((e) => e.id === eventId);
    if (!event) throw new Error("Event not found");
    const list = db.attendees.get(eventId) ?? [];
    if (!list.some((a) => a.uid === uid)) return settle(undefined);
    db.attendees.set(
      eventId,
      list.filter((a) => a.uid !== uid),
    );
    event.attendeeCount = Math.max(0, event.attendeeCount - 1);
    return settle(undefined);
  },

  async createEvent(input) {
    const event: SchoolEvent = {
      ...input,
      id: nextId("e"),
      attendeeCount: 0,
      createdAt: new Date().toISOString(),
    };
    db.events.push(event);
    return settle(event);
  },

  async updateEvent(id, patch) {
    const index = db.events.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Event not found");
    db.events[index] = { ...db.events[index], ...patch, id };
    return settle(db.events[index]);
  },

  async deleteEvent(id) {
    db.events = db.events.filter((e) => e.id !== id);
    db.attendees.delete(id);
    return settle(undefined);
  },

  /* Stats & administration ------------------------------------------------ */

  async getCommunityStats() {
    const rows = verified();
    const stats: CommunityStats = {
      alumniCount: rows.length,
      classCount: new Set(rows.map((p) => p.gradYear)).size,
      countryCount: new Set(rows.map((p) => p.country).filter(Boolean)).size,
      upcomingEventCount: db.events.filter((e) => isUpcoming(e.date)).length,
    };
    return settle(stats);
  },

  async getAdminStats() {
    const monthAgo = Date.now() - 30 * 24 * 3600e3;
    const stats: AdminStats = {
      totalAlumni: verified().length,
      pendingApprovals: db.profiles.filter((p) => p.status === "pending")
        .length,
      upcomingEvents: db.events.filter((e) => isUpcoming(e.date)).length,
      activeClasses: new Set(verified().map((p) => p.gradYear)).size,
      newMembersThisMonth: db.accounts.filter(
        (a) => Date.parse(a.createdAt) >= monthAgo,
      ).length,
    };
    return settle(stats);
  },

  async listMembersByStatus(status) {
    const rows = db.profiles
      .filter((p) => p.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return settle(rows);
  },

  async endorseMember(uid, endorserUid) {
    const profile = db.profiles.find((p) => p.uid === uid);
    if (!profile) throw new Error("Applicant not found");
    if (uid === endorserUid) throw new Error("You cannot approve yourself");

    // Idempotent: a second click from the same member must not count twice.
    if (!profile.approvedBy.includes(endorserUid)) {
      profile.approvedBy = [...profile.approvedBy, endorserUid];
    }

    if (
      profile.status === "pending" &&
      profile.approvedBy.length >= REQUIRED_APPROVALS
    ) {
      profile.status = "verified";
      const account = db.accounts.find((a) => a.uid === uid);
      if (account) {
        account.status = "verified";
        account.verifiedAt = new Date().toISOString();
      }
      if (current?.account.uid === uid) emit(buildSession(uid));
    }

    return settle(clone(profile));
  },

  async setMembershipStatus(uid, status: MembershipStatus, note) {
    const profile = db.profiles.find((p) => p.uid === uid);
    const account = db.accounts.find((a) => a.uid === uid);
    if (profile) profile.status = status;
    if (account) {
      account.status = status;
      account.statusNote = note;
      account.verifiedAt =
        status === "verified" ? new Date().toISOString() : null;
    }
    if (current?.account.uid === uid) emit(buildSession(uid));
    return settle(undefined);
  },

  async listAccounts() {
    return settle(db.accounts);
  },
};

/**
 * Reunions are marked at five-year intervals; find the next one not yet past.
 *
 * "Not yet past" is deliberately generous about the current year: in the class's
 * 25th year the answer is that year, not the 30th. Rounding up unconditionally
 * would hide the milestone reunion during the twelve months people are actually
 * planning it.
 */
export function nextMilestoneReunion(
  gradYear: number,
  now = new Date(),
): number | undefined {
  const elapsed = now.getFullYear() - gradYear;
  if (elapsed <= 0) return gradYear + 5;
  const nextMilestone =
    elapsed % 5 === 0 ? elapsed : (Math.floor(elapsed / 5) + 1) * 5;
  return gradYear + nextMilestone;
}
