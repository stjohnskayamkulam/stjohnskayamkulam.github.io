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
});
