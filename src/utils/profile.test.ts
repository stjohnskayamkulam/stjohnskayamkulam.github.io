import { describe, expect, it } from "vitest";
import { classOfLabel, isRecordedGradYear } from "./profile";

describe("isRecordedGradYear", () => {
  it("rejects the sign-in placeholder", () => {
    expect(isRecordedGradYear(0)).toBe(false);
    expect(isRecordedGradYear(undefined)).toBe(false);
  });

  it("accepts a year the school could have graduated", () => {
    expect(isRecordedGradYear(2001)).toBe(true);
  });
});

describe("classOfLabel", () => {
  it("does not print Class of 0", () => {
    expect(classOfLabel(0)).toBeNull();
    expect(classOfLabel(1997)).toBe("Class of 1997");
  });
});
