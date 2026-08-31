import { describe, expect, it } from "vitest";
import { buildMapPins, countriesFromPins } from "./mapPins";
import type { Viewer } from "./visibility";
import {
  DEFAULT_FIELD_VISIBILITY,
  type DirectoryEntry,
  type Visibility,
} from "@/types";

const signedInViewer: Viewer = {
  uid: "viewer",
  gradYear: 2005,
  isAdmin: false,
  isSignedIn: true,
};

function entry(
  overrides: Partial<DirectoryEntry> & { uid: string },
): DirectoryEntry {
  return {
    firstName: "Test",
    lastName: "Person",
    fullName: "Test Person",
    searchName: "test person",
    gradYear: 2000,
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
    ...overrides,
  };
}

function withCityVisibility(
  uid: string,
  scope: Visibility,
  extra: Partial<DirectoryEntry> = {},
) {
  return entry({
    uid,
    city: "Bengaluru",
    country: "India",
    fieldVisibility: {
      ...DEFAULT_FIELD_VISIBILITY,
      city: scope,
      country: scope,
    },
    ...extra,
  });
}

describe("buildMapPins", () => {
  it("groups everyone in one city into a single pin", () => {
    const { pins } = buildMapPins(
      [
        entry({
          uid: "a",
          city: "Bengaluru",
          country: "India",
          gradYear: 1997,
        }),
        entry({
          uid: "b",
          city: "Bengaluru",
          country: "India",
          gradYear: 2018,
        }),
        entry({ uid: "c", city: "Toronto", country: "Canada" }),
      ],
      signedInViewer,
    );

    expect(pins).toHaveLength(2);
    const bengaluru = pins.find((pin) => pin.label === "Bengaluru, India")!;
    expect(bengaluru.people.map((p) => p.uid)).toEqual(["b", "a"]);
    expect(bengaluru.country).toBe("India");
  });

  it("merges spelling variants of the same city into one pin", () => {
    // Grouping on the coordinate rather than the text is what makes this work;
    // two pins on the same dot would render as one and miscount on hover.
    const { pins } = buildMapPins(
      [
        entry({ uid: "a", city: "Bangalore", country: "India" }),
        entry({ uid: "b", city: "Bengaluru", country: "India" }),
      ],
      signedInViewer,
    );

    expect(pins).toHaveLength(1);
    expect(pins[0].people).toHaveLength(2);
  });

  it("uses stored profile coordinates instead of the country centroid", () => {
    const { pins } = buildMapPins(
      [
        entry({
          uid: "a",
          city: "Adoor",
          country: "India",
          geo: { lat: 9.155, lon: 76.731 },
        }),
      ],
      signedInViewer,
    );

    expect(pins).toHaveLength(1);
    expect(pins[0].precision).toBe("city");
    expect(pins[0].coords[0]).toBeCloseTo(9.155, 3);
    expect(pins[0].coords[1]).toBeCloseTo(76.731, 3);
  });

  it("prefers a geocoded city over India's centroid", () => {
    const extras = new Map([
      [
        "adoor|india",
        {
          coords: [9.155, 76.731] as const,
          precision: "city" as const,
        },
      ],
    ]);
    const { pins } = buildMapPins(
      [entry({ uid: "a", city: "Adoor", country: "India" })],
      signedInViewer,
      extras,
    );

    expect(pins[0].precision).toBe("city");
    expect(pins[0].coords[1]).toBeCloseTo(76.731, 3);
  });

  it("orders pins by headcount so the biggest communities read first", () => {
    const { pins } = buildMapPins(
      [
        entry({ uid: "a", city: "Toronto", country: "Canada" }),
        entry({ uid: "b", city: "Bengaluru", country: "India" }),
        entry({ uid: "c", city: "Bengaluru", country: "India" }),
      ],
      signedInViewer,
    );

    expect(pins[0].label).toBe("Bengaluru, India");
    expect(pins[0].people).toHaveLength(2);
  });

  it("lists every country, not a truncated top N", () => {
    const { pins } = buildMapPins(
      [
        entry({ uid: "a", city: "Bengaluru", country: "India" }),
        entry({ uid: "b", city: "Bengaluru", country: "India" }),
        entry({ uid: "c", city: "Toronto", country: "Canada" }),
        entry({ uid: "d", city: "Dubai", country: "United Arab Emirates" }),
      ],
      signedInViewer,
    );

    expect(countriesFromPins(pins)).toEqual([
      { country: "India", count: 2 },
      { country: "Canada", count: 1 },
      { country: "United Arab Emirates", count: 1 },
    ]);
  });

  describe("privacy", () => {
    it("never plots a member who made their location private", () => {
      const { pins, unplaced } = buildMapPins(
        [withCityVisibility("secret", "private")],
        signedInViewer,
      );

      expect(pins).toEqual([]);
      expect(unplaced.hidden).toBe(1);
    });

    it("hides a class-only location from other years but shows it to classmates", () => {
      const person = withCityVisibility("classmate", "class", {
        gradYear: 2005,
      });

      const stranger = buildMapPins([person], {
        ...signedInViewer,
        gradYear: 1997,
      });
      expect(stranger.pins).toEqual([]);
      expect(stranger.unplaced.hidden).toBe(1);

      const classmate = buildMapPins([person], {
        ...signedInViewer,
        gradYear: 2005,
      });
      expect(classmate.pins).toHaveLength(1);
    });

    it("lets admins and the member themselves see a private location", () => {
      const person = withCityVisibility("self", "private");

      expect(
        buildMapPins([person], { ...signedInViewer, isAdmin: true }).pins,
      ).toHaveLength(1);
      expect(
        buildMapPins([person], { ...signedInViewer, uid: "self" }).pins,
      ).toHaveLength(1);
    });

    it("drops a city to country precision when only the city is hidden", () => {
      const person = entry({
        uid: "partial",
        city: "Bengaluru",
        country: "India",
        fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY, city: "private" },
      });

      const { pins } = buildMapPins([person], signedInViewer);
      expect(pins).toHaveLength(1);
      expect(pins[0].precision).toBe("country");
      expect(pins[0].label).toBe("India");
      // The exact city must not survive anywhere in the pin, tooltip included.
      expect(JSON.stringify(pins)).not.toContain("Bengaluru");
    });

    it("omits a profession the member keeps private", () => {
      const person = entry({
        uid: "quiet",
        city: "Toronto",
        country: "Canada",
        profession: "Surgeon",
        fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY, profession: "private" },
      });

      const { pins } = buildMapPins([person], signedInViewer);
      expect(pins[0].people[0].profession).toBeUndefined();
      expect(JSON.stringify(pins)).not.toContain("Surgeon");
    });
  });

  describe("accounting", () => {
    it("reports members it could not place instead of dropping them", () => {
      const { pins, unplaced } = buildMapPins(
        [
          entry({ uid: "ok", city: "Toronto", country: "Canada" }),
          entry({ uid: "nowhere", city: "Atlantis", country: "Elsewhere" }),
          withCityVisibility("hidden", "private"),
          entry({ uid: "blank" }),
        ],
        signedInViewer,
      );

      expect(pins).toHaveLength(1);
      expect(unplaced.unknown).toBe(1);
      // Both the private member and the one with no location at all.
      expect(unplaced.hidden).toBe(2);
    });

    it("accounts for every person exactly once", () => {
      const people = [
        entry({ uid: "a", city: "Bengaluru", country: "India" }),
        entry({ uid: "b", city: "Bengaluru", country: "India" }),
        entry({ uid: "c", city: "Atlantis", country: "Elsewhere" }),
        withCityVisibility("d", "private"),
      ];

      const { pins, unplaced } = buildMapPins(people, signedInViewer);
      const plotted = pins.reduce((sum, pin) => sum + pin.people.length, 0);
      expect(plotted + unplaced.hidden + unplaced.unknown).toBe(people.length);
    });
  });
});
