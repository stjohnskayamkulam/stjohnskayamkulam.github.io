/**
 * Backend contracts.
 *
 * Two implementations satisfy these: `mockProvider` (empty in-memory store) and
 * `firestoreProvider` (Firebase). Everything above the service layer is written
 * against these interfaces only, so switching backends is a config change.
 */
import type {
  AdminStats,
  AlumniFilters,
  AlumniProfile,
  ClassAnnouncement,
  ClassInfo,
  CommunityStats,
  DirectoryEntry,
  EventAttendee,
  MembershipStatus,
  SchoolEvent,
  UserAccount,
} from "@/types";

/** The signed-in user plus their directory profile, resolved together. */
export interface Session {
  account: UserAccount;
  profile: AlumniProfile | null;
}

export interface AuthProvider {
  /** Fires immediately with the current session, then on every change. */
  subscribe(listener: (session: Session | null) => void): () => void;
  signInWithGoogle(): Promise<Session>;
  signOut(): Promise<void>;
  /** Re-reads the account/profile pair, e.g. after an admin verifies someone. */
  refresh(): Promise<Session | null>;
}

export interface ListOptions {
  limit?: number;
}

/** Distinct values used to populate directory filter dropdowns. */
export interface DirectoryFacets {
  gradYears: number[];
  cities: string[];
  countries: string[];
  professions: string[];
  industries: string[];
  companies: string[];
  batches: string[];
}

export interface DataProvider {
  /* Alumni */
  listAlumni(
    filters: AlumniFilters,
    options?: ListOptions,
  ): Promise<DirectoryEntry[]>;
  getProfile(uid: string): Promise<AlumniProfile | null>;
  updateProfile(
    uid: string,
    patch: Partial<AlumniProfile>,
  ): Promise<AlumniProfile>;
  getDirectoryFacets(): Promise<DirectoryFacets>;

  /* Classes */
  getClassInfo(year: number): Promise<ClassInfo>;
  listClassMembers(year: number): Promise<DirectoryEntry[]>;
  listClassAnnouncements(year: number): Promise<ClassAnnouncement[]>;
  listClassYears(): Promise<{ year: number; memberCount: number }[]>;

  /* Events */
  listEvents(
    options?: ListOptions & { upcomingOnly?: boolean; classYear?: number },
  ): Promise<SchoolEvent[]>;
  getEvent(id: string): Promise<SchoolEvent | null>;
  listAttendees(eventId: string): Promise<EventAttendee[]>;
  rsvp(eventId: string, attendee: EventAttendee): Promise<void>;
  cancelRsvp(eventId: string, uid: string): Promise<void>;
  createEvent(
    input: Omit<SchoolEvent, "id" | "attendeeCount" | "createdAt">,
  ): Promise<SchoolEvent>;
  updateEvent(id: string, patch: Partial<SchoolEvent>): Promise<SchoolEvent>;
  deleteEvent(id: string): Promise<void>;

  /* Stats & administration */
  getCommunityStats(): Promise<CommunityStats>;
  getAdminStats(): Promise<AdminStats>;
  listMembersByStatus(status: MembershipStatus): Promise<AlumniProfile[]>;
  setMembershipStatus(
    uid: string,
    status: MembershipStatus,
    note?: string,
  ): Promise<void>;
  /**
   * Records one member vouching for an applicant, verifying them once enough
   * distinct members have. Returns the applicant's resulting state.
   */
  endorseMember(uid: string, endorserUid: string): Promise<AlumniProfile>;
  listAccounts(): Promise<UserAccount[]>;
  /**
   * Appoints or revokes an ordinary admin. Superadmin is bound to the
   * bootstrap Google email and is not assignable through this write.
   */
  setUserRole(uid: string, role: "member" | "admin"): Promise<void>;
}
