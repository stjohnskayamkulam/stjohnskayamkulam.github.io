/**
 * Domain types for the alumni platform.
 *
 * Every Firestore document shape lives here. Components and services speak
 * these types; raw Firestore snapshot shapes never escape the service layer.
 *
 * Dates are stored as ISO-8601 strings in the app layer. The Firestore provider
 * converts to/from `Timestamp` at the boundary so the rest of the code never
 * has to care which backend is in use.
 */

/* -------------------------------------------------------------------------- */
/* Membership & identity                                                      */
/* -------------------------------------------------------------------------- */

/** Where a person sits in the verification funnel. */
export type MembershipStatus = "pending" | "verified" | "rejected";

/** Coarse permission level. Authoritative copy lives in `users/{uid}.role`
 *  and is enforced by Firestore rules, never by the client.
 *  `superadmin` is reserved for the bootstrap Google account. */
export type UserRole = "member" | "admin" | "superadmin";

/** `users/{uid}` — private account record. Never listed in directory queries. */
export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  status: MembershipStatus;
  /** Set by an admin when rejecting, shown back to the applicant. */
  statusNote?: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt: string;
  lastLoginAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Privacy                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Visibility scope for a profile or an individual field.
 * - `alumni`  — any verified alumnus can see it
 * - `class`   — only members of the same graduation year
 * - `private` — only the owner and admins
 */
export type Visibility = "alumni" | "class" | "private";

/** Fields a user can independently hide. Contact details default to `private`. */
export interface FieldVisibility {
  email: Visibility;
  phone: Visibility;
  city: Visibility;
  country: Visibility;
  profession: Visibility;
  company: Visibility;
  linkedinUrl: Visibility;
  bio: Visibility;
}

export const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  email: "private",
  phone: "private",
  city: "alumni",
  country: "alumni",
  profession: "alumni",
  company: "alumni",
  linkedinUrl: "alumni",
  bio: "alumni",
};

/* -------------------------------------------------------------------------- */
/* Alumni profile                                                             */
/* -------------------------------------------------------------------------- */

/** Ways an alumnus is willing to help others — powers the future mentoring module. */
export type HelpOffer =
  | "career-mentoring"
  | "college-guidance"
  | "hiring"
  | "entrepreneurship"
  | "networking"
  | "community-volunteering";

export const HELP_OFFER_LABELS: Record<HelpOffer, string> = {
  "career-mentoring": "Career mentoring",
  "college-guidance": "College guidance",
  hiring: "Hiring",
  entrepreneurship: "Entrepreneurship",
  networking: "Networking",
  "community-volunteering": "Community volunteering",
};

/** `profiles/{uid}` — the directory-visible record. */
export interface AlumniProfile {
  uid: string;
  firstName: string;
  lastName: string;
  /** Denormalised for cheap prefix search and display. */
  fullName: string;
  /** Lowercased `fullName`, used for case-insensitive Firestore range queries. */
  searchName: string;
  photoURL?: string | null;

  /** The organising principle of the whole product. */
  gradYear: number;
  /** Section/house/stream within the year, e.g. "12-A". */
  batch?: string;
  /** Classes attended at school (LKG, UKG, 1–12), not calendar years. */
  yearsAttended?: { from: string; to: string };

  city?: string;
  country?: string;
  /** City-centre pin written when the profile is saved. */
  geo?: { lat: number; lon: number } | null;
  profession?: string;
  industry?: string;
  company?: string;
  linkedinUrl?: string;

  bio?: string;
  interests: string[];
  activities: string[];
  clubs: string[];
  /** "What I've been doing since school" */
  sinceSchool?: string;
  helpOffers: HelpOffer[];

  /** Contact details — gated by `fieldVisibility`, never returned by
   *  directory list queries regardless of settings. */
  email?: string;
  phone?: string;

  visibility: Visibility;
  fieldVisibility: FieldVisibility;

  status: MembershipStatus;
  /**
   * Members who have vouched for this applicant. Reaching
   * `REQUIRED_APPROVALS` distinct endorsers is what grants access, so this is
   * the authoritative record behind `status` and is validated by security
   * rules rather than trusted from the client.
   */
  approvedBy: string[];

  createdAt: string;
  updatedAt: string;
}

/**
 * How many existing members must vouch for an applicant before the directory
 * opens to them. Changing this changes the security rules too — see
 * `firebase/firestore.rules`.
 */
export const REQUIRED_APPROVALS = 2;

/** Shape returned by directory queries — contact fields stripped. */
export type DirectoryEntry = Omit<AlumniProfile, "email" | "phone">;

export interface AlumniFilters {
  query?: string;
  gradYear?: number | null;
  /** Inclusive decade start, e.g. 1990 covers 1990–1999. */
  decade?: number | null;
  batch?: string;
  city?: string;
  country?: string;
  profession?: string;
  industry?: string;
  company?: string;
  helpOffer?: HelpOffer | null;
}

/* -------------------------------------------------------------------------- */
/* Classes                                                                    */
/* -------------------------------------------------------------------------- */

/** `classes/{year}` — aggregate counters plus class-level content. */
export interface ClassInfo {
  year: number;
  memberCount: number;
  /** Milestone reunion year, e.g. the 25th. */
  nextReunionYear?: number;
  announcements: ClassAnnouncement[];
}

export interface ClassAnnouncement {
  id: string;
  classYear: number;
  title: string;
  body: string;
  postedBy: string;
  postedByName: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

export type EventType =
  | "reunion"
  | "school-event"
  | "networking"
  | "sports"
  | "community"
  | "virtual";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  reunion: "Reunion",
  "school-event": "School Event",
  networking: "Networking",
  sports: "Sports",
  community: "Community",
  virtual: "Virtual",
};

/** `events/{eventId}` */
export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  eventType: EventType;
  organizer: string;
  imageUrl?: string | null;
  capacity?: number | null;
  /** Set when the event belongs to a single graduating class. */
  classYear?: number | null;
  /** Denormalised counter so lists don't need a subcollection read per event. */
  attendeeCount: number;
  createdBy: string;
  createdAt: string;
}

/** `events/{eventId}/attendees/{uid}` */
export interface EventAttendee {
  uid: string;
  displayName: string;
  gradYear: number;
  photoURL?: string | null;
  rsvpAt: string;
}

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                 */
/* -------------------------------------------------------------------------- */

export interface CommunityStats {
  alumniCount: number;
  classCount: number;
  countryCount: number;
  upcomingEventCount: number;
}

export interface AdminStats {
  totalAlumni: number;
  pendingApprovals: number;
  upcomingEvents: number;
  activeClasses: number;
  newMembersThisMonth: number;
}
