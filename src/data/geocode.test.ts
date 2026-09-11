import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { geocodePlace, resetGeocodeCache } from "./geocode";

describe("geocodePlace", () => {
  beforeEach(() => {
    resetGeocodeCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            {
              name: "Kayamkulam",
              latitude: 9.1718,
              longitude: 76.5013,
              country: "India",
            },
          ],
        }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns coordinates for a city the gazetteer does not list", async () => {
    const coords = await geocodePlace("Adoor", "India");
    expect(coords?.[0]).toBeCloseTo(9.1718, 3);
    expect(coords?.[1]).toBeCloseTo(76.5013, 3);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("does not hit the network a second time for the same place", async () => {
    await geocodePlace("Adoor", "India");
    await geocodePlace("Adoor", "India");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("refuses a match in a country the member did not name", async () => {
    // GeoNames answers "Cochin" with a village in Saskatchewan and nothing in
    // India. Taking the first hit would plot a Kerala alumnus in Canada.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            {
              name: "Cochin",
              latitude: 53.08346,
              longitude: -108.33465,
              country: "Canada",
            },
          ],
        }),
      })),
    );

    expect(await geocodePlace("Cochin", "India")).toBeNull();
  });
});
