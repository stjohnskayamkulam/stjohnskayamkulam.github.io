import { school } from "@/config/school";

/** A real 10th-standard year, not the `0` placeholder written at sign-in. */
export function isRecordedGradYear(
  year: number | null | undefined,
): year is number {
  return (
    typeof year === "number" &&
    Number.isInteger(year) &&
    year >= school.foundedYear
  );
}

/** `Class of 2001`, or nothing when the year was never filled in. */
export function classOfLabel(year: number | null | undefined): string | null {
  return isRecordedGradYear(year) ? `Class of ${year}` : null;
}
