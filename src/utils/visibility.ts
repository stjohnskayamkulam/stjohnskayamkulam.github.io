import type { AlumniProfile, DirectoryEntry, Visibility } from "@/types";

/**
 * Whether a given viewer may see a given profile field.
 *
 * This mirrors `firebase/firestore.rules` and is a convenience, not the
 * boundary — but it needs to be applied consistently, because a field hidden on
 * the profile page and plotted on the map is still leaked. Both callers use this
 * function so the rule cannot drift between screens.
 */
export interface Viewer {
  uid?: string;
  gradYear?: number;
  isAdmin: boolean;
  isSignedIn: boolean;
}

type VisibilityField = keyof AlumniProfile["fieldVisibility"];
type Subject = Pick<DirectoryEntry, "uid" | "gradYear" | "fieldVisibility">;

export function canSeeField(
  person: Subject,
  field: VisibilityField,
  viewer: Viewer,
): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.uid && viewer.uid === person.uid) return true;

  const scope: Visibility = person.fieldVisibility[field];
  if (scope === "private") return false;
  if (scope === "class") return viewer.gradYear === person.gradYear;
  return viewer.isSignedIn;
}
