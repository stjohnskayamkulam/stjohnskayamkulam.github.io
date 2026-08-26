/**
 * Firebase-backed implementation of the auth and data contracts.
 *
 * Conventions:
 *  - Timestamps are converted to ISO strings at this boundary; no `Timestamp`
 *    ever reaches a component.
 *  - Counters (`attendeeCount`, `likeCount`, …) are denormalised and updated
 *    with `increment()` so list views never need an extra read per row.
 *  - Client-side filtering is used for the low-cardinality directory facets.
 *    Firestore cannot combine many equality filters with a text search, so the
 *    strategy is: narrow server-side on the most selective filter, refine in
 *    memory. Revisit with Algolia/Typesense past a few thousand alumni.
 */
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit as fsLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebase } from "@/services/firebase";
import { isSuperAdminEmail } from "@/config/admins";
import { shouldFallbackToRedirect } from "@/utils/authErrors";
import { DEFAULT_FIELD_VISIBILITY, REQUIRED_APPROVALS } from "@/types";
import type {
  AdminStats,
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
import type {
  AuthProvider,
  DataProvider,
  DirectoryFacets,
  Session,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Conversion helpers                                                         */
/* -------------------------------------------------------------------------- */

function iso(value: unknown, fallback = new Date().toISOString()): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return fallback;
}

/** Firestore rejects `undefined`; drop those keys before writing. */
function pruneUndefined<T extends object>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as T;
}

function toAccount(uid: string, data: DocumentData): UserAccount {
  return {
    uid,
    email: data.email ?? "",
    displayName: data.displayName ?? "",
    photoURL: data.photoURL ?? null,
    role:
      data.role === "superadmin"
        ? "superadmin"
        : data.role === "admin"
          ? "admin"
          : "member",
    status: (data.status as MembershipStatus) ?? "pending",
    statusNote: data.statusNote,
    verifiedAt: data.verifiedAt ? iso(data.verifiedAt) : null,
    verifiedBy: data.verifiedBy ?? null,
    createdAt: iso(data.createdAt),
    lastLoginAt: data.lastLoginAt ? iso(data.lastLoginAt) : undefined,
  };
}

function toProfile(uid: string, data: DocumentData): AlumniProfile {
  return {
    uid,
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    fullName:
      data.fullName ?? `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
    searchName: data.searchName ?? "",
    photoURL: data.photoURL ?? null,
    gradYear: Number(data.gradYear) || 0,
    batch: data.batch,
    yearsAttended: data.yearsAttended,
    city: data.city,
    country: data.country,
    profession: data.profession,
    industry: data.industry,
    company: data.company,
    linkedinUrl: data.linkedinUrl,
    bio: data.bio,
    interests: data.interests ?? [],
    activities: data.activities ?? [],
    clubs: data.clubs ?? [],
    sinceSchool: data.sinceSchool,
    helpOffers: data.helpOffers ?? [],
    email: data.email,
    phone: data.phone,
    visibility: data.visibility ?? "alumni",
    fieldVisibility: {
      ...DEFAULT_FIELD_VISIBILITY,
      ...(data.fieldVisibility ?? {}),
    },
    status: (data.status as MembershipStatus) ?? "pending",
    approvedBy: (data.approvedBy as string[]) ?? [],
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

const stripContact = (p: AlumniProfile): DirectoryEntry => {
  const { email: _email, phone: _phone, ...rest } = p;
  return rest;
};

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

async function loadSession(user: User): Promise<Session> {
  const { db } = getFirebase();
  const accountRef = doc(db, "users", user.uid);
  const profileRef = doc(db, "profiles", user.uid);
  const accountSnap = await getDoc(accountRef);
  const bootstrap = isSuperAdminEmail(user.email);

  if (!accountSnap.exists()) {
    const displayName = user.displayName ?? user.email ?? "New member";
    const nameParts = displayName.trim().split(/\s+/);
    const firstName = nameParts[0] || "New";
    const lastName = nameParts.slice(1).join(" ") || "Member";
    const fullName = `${firstName} ${lastName}`.trim();
    const role = bootstrap ? "superadmin" : "member";
    const status = bootstrap ? "verified" : "pending";
    const batch = writeBatch(db);
    batch.set(
      accountRef,
      pruneUndefined({
        uid: user.uid,
        email: user.email ?? "",
        displayName,
        photoURL: user.photoURL,
        role,
        status,
        createdAt: serverTimestamp(),
        ...(bootstrap ? { verifiedAt: serverTimestamp() } : {}),
      }),
    );
    batch.set(
      profileRef,
      pruneUndefined({
        uid: user.uid,
        firstName,
        lastName,
        fullName,
        searchName: fullName.toLowerCase(),
        gradYear: new Date().getFullYear(),
        photoURL: user.photoURL,
        email: user.email ?? "",
        interests: [],
        activities: [],
        clubs: [],
        helpOffers: [],
        visibility: "alumni",
        fieldVisibility: DEFAULT_FIELD_VISIBILITY,
        status,
        approvedBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await batch.commit();
    return loadSession(user);
  }

  if (bootstrap) {
    const account = toAccount(user.uid, accountSnap.data());
    const profileSnap = await getDoc(profileRef);
    const needsPromotion =
      account.role !== "superadmin" || account.status !== "verified";
    const profileNeedsPromotion =
      profileSnap.exists() &&
      (profileSnap.data()?.status as string) !== "verified";
    if (needsPromotion || profileNeedsPromotion) {
      const batch = writeBatch(db);
      batch.set(
        accountRef,
        pruneUndefined({
          ...accountSnap.data(),
          role: "superadmin",
          status: "verified",
          email: user.email ?? account.email,
          verifiedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      if (profileSnap.exists()) {
        batch.update(profileRef, {
          status: "verified",
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      return loadSession(user);
    }
  }

  const profileSnap = await getDoc(profileRef);
  return {
    account: toAccount(user.uid, accountSnap.data()),
    profile: profileSnap.exists()
      ? toProfile(user.uid, profileSnap.data())
      : null,
  };
}

export const firestoreAuthProvider: AuthProvider = {
  subscribe(listener) {
    const { auth } = getFirebase();
    // Completes signInWithRedirect when the popup path was blocked (common on
    // GitHub Pages because of Cross-Origin-Opener-Policy).
    void getRedirectResult(auth).catch(() => {
      // A failed redirect still leaves onAuthStateChanged as the source of truth.
    });
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        listener(null);
        return;
      }
      loadSession(user)
        .then(listener)
        .catch((err) => {
          console.error("Failed to load the signed-in account", err);
          void fbSignOut(auth);
          listener(null);
        });
    });
  },

  async signInWithGoogle() {
    const { auth } = getFirebase();
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const credential = await signInWithPopup(auth, provider);
      return loadSession(credential.user);
    } catch (err) {
      if (shouldFallbackToRedirect(err)) {
        await signInWithRedirect(auth, provider);
        return new Promise<Session>(() => {
          /* The document unloads for Google; this promise is not meant to settle. */
        });
      }
      throw err;
    }
  },

  async signOut() {
    const { auth } = getFirebase();
    await fbSignOut(auth);
  },

  async refresh() {
    const { auth } = getFirebase();
    const user = auth.currentUser;
    return user ? loadSession(user) : null;
  },
};

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

const uniqueSorted = (values: (string | undefined)[]): string[] =>
  [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b),
  );

async function fetchVerifiedProfiles(
  constraints: QueryConstraint[] = [],
): Promise<AlumniProfile[]> {
  const { db } = getFirebase();
  const snap = await getDocs(
    query(
      collection(db, "profiles"),
      where("status", "==", "verified"),
      ...constraints,
    ),
  );
  return snap.docs.map((d) => toProfile(d.id, d.data()));
}

export const firestoreDataProvider: DataProvider = {
  /* Alumni ---------------------------------------------------------------- */

  async listAlumni(filters, options) {
    const constraints: QueryConstraint[] = [];
    // Pick the single most selective server-side filter; the rest are applied
    // in memory to avoid demanding a composite index per filter combination.
    if (filters.gradYear)
      constraints.push(where("gradYear", "==", filters.gradYear));
    else if (filters.country)
      constraints.push(where("country", "==", filters.country));
    else if (filters.company)
      constraints.push(where("company", "==", filters.company));
    constraints.push(orderBy("gradYear", "desc"));
    if (!filters.query) constraints.push(fsLimit(options?.limit ?? 300));

    const rows = await fetchVerifiedProfiles(constraints);
    const q = filters.query?.trim().toLowerCase();

    const filtered = rows.filter((p) => {
      if (q) {
        const haystack = [
          p.fullName,
          p.company,
          p.profession,
          p.city,
          p.country,
          p.industry,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (
        filters.decade &&
        (p.gradYear < filters.decade || p.gradYear > filters.decade + 9)
      )
        return false;
      if (filters.batch && p.batch !== filters.batch) return false;
      if (filters.city && p.city !== filters.city) return false;
      if (filters.country && p.country !== filters.country) return false;
      if (filters.profession && p.profession !== filters.profession)
        return false;
      if (filters.industry && p.industry !== filters.industry) return false;
      if (filters.company && p.company !== filters.company) return false;
      if (filters.helpOffer && !p.helpOffers.includes(filters.helpOffer))
        return false;
      return true;
    });

    const stripped = filtered.map(stripContact);
    return options?.limit ? stripped.slice(0, options.limit) : stripped;
  },

  async getProfile(uid) {
    const { db } = getFirebase();
    const snap = await getDoc(doc(db, "profiles", uid));
    return snap.exists() ? toProfile(snap.id, snap.data()) : null;
  },

  async updateProfile(uid, patch) {
    const { db } = getFirebase();
    const next = pruneUndefined({ ...patch, updatedAt: serverTimestamp() });
    if (patch.firstName || patch.lastName) {
      const existing = await this.getProfile(uid);
      const fullName = `${patch.firstName ?? existing?.firstName ?? ""} ${
        patch.lastName ?? existing?.lastName ?? ""
      }`.trim();
      Object.assign(next, { fullName, searchName: fullName.toLowerCase() });
    }
    await updateDoc(doc(db, "profiles", uid), next);
    const updated = await this.getProfile(uid);
    if (!updated) throw new Error("Profile not found after update");
    return updated;
  },

  async getDirectoryFacets() {
    const rows = await fetchVerifiedProfiles();
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
    return facets;
  },

  /* Classes --------------------------------------------------------------- */

  async getClassInfo(year) {
    const { db } = getFirebase();
    const [snap, announcements, members] = await Promise.all([
      getDoc(doc(db, "classes", String(year))),
      this.listClassAnnouncements(year),
      getCountFromServer(
        query(
          collection(db, "profiles"),
          where("status", "==", "verified"),
          where("gradYear", "==", year),
        ),
      ),
    ]);
    const data = snap.data() ?? {};
    const info: ClassInfo = {
      year,
      memberCount: members.data().count,
      nextReunionYear: data.nextReunionYear,
      announcements,
    };
    return info;
  },

  async listClassMembers(year) {
    const rows = await fetchVerifiedProfiles([where("gradYear", "==", year)]);
    return rows
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(stripContact);
  },

  async listClassAnnouncements(year) {
    const { db } = getFirebase();
    const snap = await getDocs(
      query(
        collection(db, "classes", String(year), "announcements"),
        orderBy("createdAt", "desc"),
        fsLimit(20),
      ),
    );
    return snap.docs.map((d) => ({
      id: d.id,
      classYear: year,
      title: d.data().title ?? "",
      body: d.data().body ?? "",
      postedBy: d.data().postedBy ?? "",
      postedByName: d.data().postedByName ?? "",
      createdAt: iso(d.data().createdAt),
    })) satisfies ClassAnnouncement[];
  },

  async listClassYears() {
    const rows = await fetchVerifiedProfiles();
    const counts = new Map<number, number>();
    for (const p of rows)
      counts.set(p.gradYear, (counts.get(p.gradYear) ?? 0) + 1);
    return [...counts.entries()]
      .map(([year, memberCount]) => ({ year, memberCount }))
      .sort((a, b) => b.year - a.year);
  },

  /* Events ---------------------------------------------------------------- */

  async listEvents(options) {
    const { db } = getFirebase();
    const constraints: QueryConstraint[] = [orderBy("date", "asc")];
    if (options?.upcomingOnly) {
      constraints.unshift(
        where("date", ">=", new Date().toISOString().slice(0, 10)),
      );
    }
    if (options?.classYear != null) {
      constraints.unshift(where("classYear", "==", options.classYear));
    }
    if (options?.limit) constraints.push(fsLimit(options.limit));
    const snap = await getDocs(query(collection(db, "events"), ...constraints));
    return snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: iso(d.data().createdAt),
        }) as SchoolEvent,
    );
  },

  async getEvent(id) {
    const { db } = getFirebase();
    const snap = await getDoc(doc(db, "events", id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...snap.data(),
      createdAt: iso(snap.data().createdAt),
    } as SchoolEvent;
  },

  async listAttendees(eventId) {
    const { db } = getFirebase();
    const snap = await getDocs(collection(db, "events", eventId, "attendees"));
    return snap.docs.map(
      (d) =>
        ({
          ...d.data(),
          uid: d.id,
          rsvpAt: iso(d.data().rsvpAt),
        }) as EventAttendee,
    );
  },

  async rsvp(eventId, attendee) {
    const { db } = getFirebase();
    const batch = writeBatch(db);
    batch.set(
      doc(db, "events", eventId, "attendees", attendee.uid),
      pruneUndefined({ ...attendee, rsvpAt: serverTimestamp() }),
    );
    batch.update(doc(db, "events", eventId), { attendeeCount: increment(1) });
    await batch.commit();
  },

  async cancelRsvp(eventId, uid) {
    const { db } = getFirebase();
    const batch = writeBatch(db);
    batch.delete(doc(db, "events", eventId, "attendees", uid));
    batch.update(doc(db, "events", eventId), { attendeeCount: increment(-1) });
    await batch.commit();
  },

  async createEvent(input) {
    const { db } = getFirebase();
    const ref = await addDoc(
      collection(db, "events"),
      pruneUndefined({
        ...input,
        attendeeCount: 0,
        createdAt: serverTimestamp(),
      }),
    );
    return {
      ...input,
      id: ref.id,
      attendeeCount: 0,
      createdAt: new Date().toISOString(),
    };
  },

  async updateEvent(id, patch) {
    const { db } = getFirebase();
    await updateDoc(doc(db, "events", id), pruneUndefined(patch));
    const updated = await this.getEvent(id);
    if (!updated) throw new Error("Event not found after update");
    return updated;
  },

  async deleteEvent(id) {
    const { db } = getFirebase();
    await deleteDoc(doc(db, "events", id));
  },

  /* Stats & administration ------------------------------------------------ */

  async getCommunityStats() {
    const { db } = getFirebase();
    const [alumniCount, events, profiles] = await Promise.all([
      getCountFromServer(
        query(collection(db, "profiles"), where("status", "==", "verified")),
      ),
      this.listEvents({ upcomingOnly: true }),
      fetchVerifiedProfiles(),
    ]);
    const stats: CommunityStats = {
      alumniCount: alumniCount.data().count,
      classCount: new Set(profiles.map((p) => p.gradYear)).size,
      countryCount: new Set(profiles.map((p) => p.country).filter(Boolean))
        .size,
      upcomingEventCount: events.length,
    };
    return stats;
  },

  async getAdminStats() {
    const { db } = getFirebase();
    const monthAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 3600e3);
    const [total, pending, events, profiles, newMembers] = await Promise.all([
      getCountFromServer(
        query(collection(db, "profiles"), where("status", "==", "verified")),
      ),
      getCountFromServer(
        query(collection(db, "profiles"), where("status", "==", "pending")),
      ),
      this.listEvents({ upcomingOnly: true }),
      fetchVerifiedProfiles(),
      getCountFromServer(
        query(collection(db, "users"), where("createdAt", ">=", monthAgo)),
      ),
    ]);
    const stats: AdminStats = {
      totalAlumni: total.data().count,
      pendingApprovals: pending.data().count,
      upcomingEvents: events.length,
      activeClasses: new Set(profiles.map((p) => p.gradYear)).size,
      newMembersThisMonth: newMembers.data().count,
    };
    return stats;
  },

  async listMembersByStatus(status) {
    const { db } = getFirebase();
    const snap = await getDocs(
      query(
        collection(db, "profiles"),
        where("status", "==", status),
        fsLimit(200),
      ),
    );
    return snap.docs.map((d) => toProfile(d.id, d.data()));
  },

  async endorseMember(uid, endorserUid) {
    if (uid === endorserUid) throw new Error("You cannot approve yourself");
    const { db } = getFirebase();
    const ref = doc(db, "profiles", uid);

    // A transaction keeps the count honest when two members approve at once.
    // Only the profile is written: an endorser has no rights over the
    // applicant's private `users/{uid}` record, so `profiles/{uid}.status` is
    // the field security rules read when deciding who is verified.
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Applicant not found");
      const profile = toProfile(uid, snap.data());

      if (profile.approvedBy.includes(endorserUid)) return profile;
      const approvedBy = [...profile.approvedBy, endorserUid];
      const status =
        profile.status === "pending" && approvedBy.length >= REQUIRED_APPROVALS
          ? "verified"
          : profile.status;

      tx.update(ref, { approvedBy, status, updatedAt: serverTimestamp() });
      return { ...profile, approvedBy, status };
    });
  },

  async setMembershipStatus(uid, status, note) {
    const { db, auth } = getFirebase();
    const batch = writeBatch(db);
    batch.update(
      doc(db, "users", uid),
      pruneUndefined({
        status,
        statusNote: note,
        verifiedAt: status === "verified" ? serverTimestamp() : null,
        verifiedBy: auth.currentUser?.uid ?? null,
      }),
    );
    batch.update(doc(db, "profiles", uid), {
      status,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  },

  async listAccounts() {
    const { db } = getFirebase();
    const snap = await getDocs(query(collection(db, "users"), fsLimit(500)));
    return snap.docs.map((d) => toAccount(d.id, d.data()));
  },
};
