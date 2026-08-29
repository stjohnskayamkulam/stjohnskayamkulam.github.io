/** Alumni directory, profiles and class rosters. */
import { getDataProvider } from "@/services";
import { school } from "@/config/school";
import {
  orderClasses,
  parseSchoolClass,
  type ClassesAttended,
} from "@/config/schoolClasses";
import type { DirectoryFacets, ListOptions } from "@/services/providers/types";
import type {
  AlumniFilters,
  AlumniProfile,
  ClassAnnouncement,
  ClassInfo,
  CommunityStats,
  DirectoryEntry,
} from "@/types";
import { track } from "@/utils/analytics";

export async function searchAlumni(
  filters: AlumniFilters,
  options?: ListOptions,
): Promise<DirectoryEntry[]> {
  const results = await (await getDataProvider()).listAlumni(filters, options);
  const activeFilters = Object.entries(filters).filter(
    ([, v]) => v != null && v !== "",
  ).length;
  track("alumni_search", {
    activeFilters,
    resultCount: results.length,
    query: filters.query,
  });
  return results;
}

export async function getProfile(uid: string): Promise<AlumniProfile | null> {
  const profile = await (await getDataProvider()).getProfile(uid);
  if (profile) track("profile_view", { uid, gradYear: profile.gradYear });
  return profile;
}

export async function updateProfile(
  uid: string,
  patch: Partial<AlumniProfile>,
): Promise<AlumniProfile> {
  const updated = await (await getDataProvider()).updateProfile(uid, patch);
  if (isProfileComplete(updated)) track("profile_completed", { uid });
  return updated;
}

export const REQUIRED_PROFILE_MESSAGE =
  "Name, graduation year, classes attended, city and country are required.";

/** Enough detail to be findable and worth finding. */
export function isProfileComplete(
  profile: AlumniProfile | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.firstName?.trim() &&
    profile.lastName?.trim() &&
    Number.isInteger(profile.gradYear) &&
    profile.gradYear >= 1900 &&
    profile.yearsAttended?.from &&
    profile.yearsAttended?.to &&
    profile.city?.trim() &&
    profile.country?.trim(),
  );
}

/** Shared by the first-sign-in modal and the full profile form. */
export function parseRequiredProfileFields(form: FormData): {
  firstName: string;
  lastName: string;
  gradYear: number;
  yearsAttended: ClassesAttended;
  city: string;
  country: string;
} {
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const gradYear = Number(form.get("gradYear"));
  const attendedFrom = parseSchoolClass(form.get("attendedFrom"));
  const attendedTo = parseSchoolClass(form.get("attendedTo"));
  const city = String(form.get("city") ?? "").trim();
  const country = String(form.get("country") ?? "").trim();
  const maxYear = new Date().getFullYear() + 1;

  if (
    !firstName ||
    !lastName ||
    !Number.isInteger(gradYear) ||
    gradYear < school.foundedYear ||
    gradYear > maxYear ||
    !attendedFrom ||
    !attendedTo ||
    !city ||
    !country
  ) {
    throw new Error(REQUIRED_PROFILE_MESSAGE);
  }

  return {
    firstName,
    lastName,
    gradYear,
    yearsAttended: orderClasses(attendedFrom, attendedTo),
    city,
    country,
  };
}

export function profileCompletion(profile: AlumniProfile): number {
  const checks = [
    profile.firstName && profile.lastName,
    profile.gradYear,
    profile.yearsAttended?.from && profile.yearsAttended?.to,
    profile.city,
    profile.country,
    profile.photoURL,
    profile.profession,
    profile.industry,
    profile.company,
    profile.bio,
    profile.sinceSchool,
    profile.interests.length > 0,
    profile.helpOffers.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function getDirectoryFacets(): Promise<DirectoryFacets> {
  return (await getDataProvider()).getDirectoryFacets();
}

export async function getClassInfo(year: number): Promise<ClassInfo> {
  track("class_view", { year });
  return (await getDataProvider()).getClassInfo(year);
}

export async function listClassMembers(
  year: number,
): Promise<DirectoryEntry[]> {
  return (await getDataProvider()).listClassMembers(year);
}

export async function listClassAnnouncements(
  year: number,
): Promise<ClassAnnouncement[]> {
  return (await getDataProvider()).listClassAnnouncements(year);
}

export async function listClassYears(): Promise<
  { year: number; memberCount: number }[]
> {
  return (await getDataProvider()).listClassYears();
}

export async function getCommunityStats(): Promise<CommunityStats> {
  return (await getDataProvider()).getCommunityStats();
}
