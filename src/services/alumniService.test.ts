import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD_VISIBILITY, type AlumniProfile } from "@/types";
import {
  isProfileComplete,
  parseRequiredProfileFields,
  REQUIRED_PROFILE_MESSAGE,
  sessionNeedsRequiredProfile,
} from "./alumniService";

const base: AlumniProfile = {
  uid: "u-1",
  firstName: "Ana",
  lastName: "Nair",
  fullName: "Ana Nair",
  searchName: "ana nair",
  gradYear: 2010,
  yearsAttended: { from: "LKG", to: "12" },
  city: "Kayamkulam",
  country: "India",
  interests: [],
  activities: [],
  clubs: [],
  helpOffers: [],
  visibility: "alumni",
  fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
  status: "verified",
  approvedBy: [],
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

describe("isProfileComplete", () => {
  it("is true when required fields are present", () => {
    expect(isProfileComplete(base)).toBe(true);
  });

  it("is false for a missing city or a placeholder graduation year", () => {
    expect(isProfileComplete({ ...base, city: "" })).toBe(false);
    expect(isProfileComplete({ ...base, gradYear: 0 })).toBe(false);
    expect(isProfileComplete(null)).toBe(false);
  });

  it("does not treat leftover calendar years as classes attended", () => {
    expect(
      isProfileComplete({
        ...base,
        yearsAttended: { from: "1998", to: "2010" },
      }),
    ).toBe(false);
  });
});

describe("sessionNeedsRequiredProfile", () => {
  it("asks returning members to fill gaps, not only first-time sign-in", () => {
    expect(
      sessionNeedsRequiredProfile({
        profile: { ...base, yearsAttended: undefined },
      }),
    ).toBe(true);
    expect(sessionNeedsRequiredProfile({ profile: base })).toBe(false);
    expect(sessionNeedsRequiredProfile({ profile: { ...base, gradYear: 0 } })).toBe(
      true,
    );
    expect(sessionNeedsRequiredProfile(null)).toBe(false);
  });
});

describe("parseRequiredProfileFields", () => {
  it("reads the required form fields", () => {
    const form = new FormData();
    form.set("firstName", " Ana ");
    form.set("lastName", "Nair");
    form.set("gradYear", "2010");
    form.set("attendedFrom", "LKG");
    form.set("attendedTo", "10");
    form.set("city", "Kayamkulam");
    form.set("country", "India");

    expect(parseRequiredProfileFields(form)).toEqual({
      firstName: "Ana",
      lastName: "Nair",
      gradYear: 2010,
      yearsAttended: { from: "LKG", to: "10" },
      city: "Kayamkulam",
      country: "India",
    });
  });

  it("rejects an incomplete form", () => {
    expect(() => parseRequiredProfileFields(new FormData())).toThrow(
      REQUIRED_PROFILE_MESSAGE,
    );
  });
});
