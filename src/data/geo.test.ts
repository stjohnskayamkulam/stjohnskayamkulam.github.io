import { describe, expect, it } from "vitest";
import { canonicalCountry, normalizePlace, resolveLocation } from "./geo";
import { seedProfiles } from "./seed";

describe("normalizePlace", () => {
  it("ignores case, accents, punctuation and padding", () => {
    expect(normalizePlace("  Bengalūru ")).toBe("bengaluru");
    expect(normalizePlace("St. John’s")).toBe("st johns");
    expect(normalizePlace(undefined)).toBe("");
  });
});

describe("canonicalCountry", () => {
  it("folds the spellings people actually type into one country", () => {
    for (const spelling of [
      "USA",
      "U.S.A.",
      "United States of America",
      "us",
    ]) {
      expect(canonicalCountry(spelling)).toBe("united states");
    }
    expect(canonicalCountry("UAE")).toBe("united arab emirates");
    expect(canonicalCountry("England")).toBe("united kingdom");
  });
});

describe("resolveLocation", () => {
  it("places a known city at city precision", () => {
    const result = resolveLocation("Bengaluru", "India");
    expect(result?.precision).toBe("city");
    expect(result?.coords[0]).toBeCloseTo(12.97, 1);
    expect(result?.coords[1]).toBeCloseTo(77.59, 1);
  });

  it("treats a renamed city as the same point", () => {
    // Members who left decades ago will write the name they grew up with.
    expect(resolveLocation("Bangalore", "India")?.coords).toEqual(
      resolveLocation("Bengaluru", "India")?.coords,
    );
    expect(resolveLocation("Bombay", "India")?.coords).toEqual(
      resolveLocation("Mumbai", "India")?.coords,
    );
  });

  it("resolves a city even when the country is spelled differently", () => {
    // "Dubai, UAE" and "Abu Dhabi, United Arab Emirates" both appear in the seed.
    expect(resolveLocation("Dubai", "UAE")?.precision).toBe("city");
    expect(resolveLocation("New York", "USA")?.precision).toBe("city");
  });

  it("falls back to the country when the city is unknown", () => {
    const result = resolveLocation("Some Small Town", "India");
    expect(result?.precision).toBe("country");
    expect(result?.coords).toEqual(resolveLocation(null, "India")?.coords);
  });

  it("covers city-states the map geometry omits", () => {
    // Singapore is absent from the 110m atlas, so it has to come from the table.
    expect(resolveLocation("Singapore", "Singapore")?.precision).toBe("city");
    expect(resolveLocation(null, "Singapore")).not.toBeNull();
    expect(resolveLocation(null, "Hong Kong")).not.toBeNull();
  });

  it("places a city whose country is hidden, when the name is unambiguous", () => {
    expect(resolveLocation("Bengaluru", null)?.precision).toBe("city");
  });

  it("refuses to guess when nothing is known", () => {
    expect(resolveLocation(null, null)).toBeNull();
    expect(resolveLocation("Atlantis", "Elsewhere")).toBeNull();
  });
});

describe("gazetteer coverage", () => {
  it("resolves every seeded alumnus to a city, not a country centroid", () => {
    // A country-level fallback in the demo would look like a bug: pins stacked
    // in the middle of India instead of spread across its cities.
    const located = seedProfiles.filter((person) => person.city);

    // Guards against this test passing because the seed changed shape.
    expect(located.length).toBeGreaterThan(20);

    const imprecise = located
      .map((person) => ({
        name: person.fullName,
        place: `${person.city}, ${person.country}`,
        precision:
          resolveLocation(person.city, person.country)?.precision ??
          "unresolved",
      }))
      .filter((row) => row.precision !== "city");

    expect(imprecise).toEqual([]);
  });
});
