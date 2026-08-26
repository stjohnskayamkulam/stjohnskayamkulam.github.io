/** The classes St. John's runs, in order from first year through leaving. */
export const SCHOOL_CLASSES = [
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

export type SchoolClass = (typeof SCHOOL_CLASSES)[number];

export type ClassesAttended = { from: SchoolClass; to: SchoolClass };

function asSchoolClass(value: string): SchoolClass | undefined {
  return (SCHOOL_CLASSES as readonly string[]).includes(value)
    ? (value as SchoolClass)
    : undefined;
}

/** Accepts LKG/UKG/1–12. Drops leftover calendar years (e.g. 1998). */
export function parseSchoolClass(value: unknown): SchoolClass | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 1 && value <= 12) {
      return String(value) as SchoolClass;
    }
    return undefined;
  }
  const raw = String(value).trim();
  const upper = raw.toUpperCase();
  if (upper === "LKG" || upper === "UKG") return upper;
  const classMatch = raw.match(/^(?:class\s*)?(\d{1,2})$/i);
  if (classMatch) return asSchoolClass(classMatch[1]);
  return asSchoolClass(raw);
}

export function parseClassesAttended(
  raw: unknown,
): ClassesAttended | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as { from?: unknown; to?: unknown };
  const from = parseSchoolClass(record.from);
  const to = parseSchoolClass(record.to) ?? from;
  if (!from || !to) return undefined;
  return orderClasses(from, to);
}

export function orderClasses(a: SchoolClass, b: SchoolClass): ClassesAttended {
  return SCHOOL_CLASSES.indexOf(a) <= SCHOOL_CLASSES.indexOf(b)
    ? { from: a, to: b }
    : { from: b, to: a };
}

export function formatClassesAttended(range: ClassesAttended): string {
  if (range.from === range.to) return range.from;
  return `${range.from}–${range.to}`;
}
