/** Date helpers built on `Intl` so the bundle carries no date library. */

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Parses `YYYY-MM-DD` as a local date so events don't shift a day westward. */
export function parseDate(value: string): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (dateOnly) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatEventDate(value: string): string {
  return longDate.format(parseDate(value));
}

export function formatDate(value: string): string {
  return shortDate.format(parseDate(value));
}

/** `6:00 PM` from `18:00`. */
export function formatTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h)) return value;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export function formatRelative(value: string, now: Date = new Date()): string {
  const diffMs = parseDate(value).getTime() - now.getTime();
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 3600e3],
    ["month", 30 * 24 * 3600e3],
    ["week", 7 * 24 * 3600e3],
    ["day", 24 * 3600e3],
    ["hour", 3600e3],
    ["minute", 60e3],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms)
      return relative.format(Math.round(diffMs / ms), unit);
  }
  return "just now";
}

export function isUpcoming(dateValue: string, now: Date = new Date()): boolean {
  const end = parseDate(dateValue);
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= now.getTime();
}

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

export function decadeLabel(decade: number): string {
  return `${decade}s`;
}

/** Ordinal reunion label, e.g. "25-Year Reunion". */
export function yearsSince(gradYear: number, now: Date = new Date()): number {
  return now.getFullYear() - gradYear;
}
