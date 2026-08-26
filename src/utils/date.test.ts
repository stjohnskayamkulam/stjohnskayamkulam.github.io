import { describe, expect, it } from "vitest";
import {
  decadeOf,
  formatTime,
  isUpcoming,
  parseDate,
  yearsSince,
} from "./date";

describe("parseDate", () => {
  it("reads a date-only string in local time", () => {
    // Parsing "2026-10-10" with `new Date()` yields UTC midnight, which renders
    // as October 9th for anyone west of Greenwich. An event on the wrong day is
    // the kind of bug that makes people miss a reunion.
    const parsed = parseDate("2026-10-10");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(10);
  });
});

describe("isUpcoming", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0);

  it("treats an event later today as upcoming", () => {
    expect(isUpcoming("2026-06-15", now)).toBe(true);
  });

  it("excludes yesterday", () => {
    expect(isUpcoming("2026-06-14", now)).toBe(false);
  });

  it("includes future dates", () => {
    expect(isUpcoming("2026-10-10", now)).toBe(true);
  });
});

describe("formatTime", () => {
  it.each([
    ["18:00", "6:00 PM"],
    ["09:30", "9:30 AM"],
    ["00:15", "12:15 AM"],
    ["12:00", "12:00 PM"],
  ])("renders %s as %s", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  it("passes through values it cannot parse", () => {
    expect(formatTime("evening")).toBe("evening");
  });
});

describe("decadeOf", () => {
  it.each([
    [1997, 1990],
    [2000, 2000],
    [2009, 2000],
    [2024, 2020],
  ])("maps %i to the %i decade", (year, decade) => {
    expect(decadeOf(year)).toBe(decade);
  });
});

describe("yearsSince", () => {
  it("counts calendar years since graduation", () => {
    expect(yearsSince(2001, new Date(2026, 0, 1))).toBe(25);
  });
});
