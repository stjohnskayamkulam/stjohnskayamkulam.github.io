import { describe, expect, it } from "vitest";
import {
  formatClassesAttended,
  parseClassesAttended,
  parseSchoolClass,
} from "./schoolClasses";

describe("parseSchoolClass", () => {
  it("accepts LKG, UKG and 1 through 12", () => {
    expect(parseSchoolClass("LKG")).toBe("LKG");
    expect(parseSchoolClass("ukg")).toBe("UKG");
    expect(parseSchoolClass(1)).toBe("1");
    expect(parseSchoolClass("12")).toBe("12");
    expect(parseSchoolClass("Class 8")).toBe("8");
  });

  it("ignores calendar years left over from the old form", () => {
    expect(parseSchoolClass(1998)).toBeUndefined();
    expect(parseSchoolClass("2005")).toBeUndefined();
  });
});

describe("parseClassesAttended", () => {
  it("orders a reversed range", () => {
    expect(parseClassesAttended({ from: "12", to: "LKG" })).toEqual({
      from: "LKG",
      to: "12",
    });
  });
});

describe("formatClassesAttended", () => {
  it("shows a span with an en dash", () => {
    expect(formatClassesAttended({ from: "UKG", to: "10" })).toBe("UKG–10");
  });
});
