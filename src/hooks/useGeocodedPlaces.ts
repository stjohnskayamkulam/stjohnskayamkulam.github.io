import { useEffect, useState } from "react";
import { geocodePlace } from "@/data/geocode";
import {
  placeLookupKey,
  resolveLocation,
  type ResolvedLocation,
} from "@/data/geo";
import type { DirectoryEntry } from "@/types";
import { canSeeField, type Viewer } from "@/utils/visibility";

/**
 * Fills in city coordinates the offline gazetteer does not know, so a profile
 * that says "Adoor" is not dumped on India's centroid.
 */
export function useGeocodedPlaces(
  entries: DirectoryEntry[] | undefined,
  viewer: Viewer,
): Map<string, ResolvedLocation> {
  const [overrides, setOverrides] = useState(
    () => new Map<string, ResolvedLocation>(),
  );

  useEffect(() => {
    if (!entries?.length) return;
    let cancelled = false;

    const jobs: { key: string; city: string; country: string | undefined }[] =
      [];
    const seen = new Set<string>();

    for (const person of entries) {
      const city = canSeeField(person, "city", viewer)
        ? person.city
        : undefined;
      if (!city) continue;
      if (person.geo) continue;
      const country = canSeeField(person, "country", viewer)
        ? person.country
        : undefined;
      const resolved = resolveLocation(city, country);
      if (resolved?.precision === "city") continue;
      const key = placeLookupKey(city, country);
      if (!key.startsWith("|") && !seen.has(key)) {
        seen.add(key);
        jobs.push({ key, city, country });
      }
    }

    if (jobs.length === 0) return;

    void (async () => {
      const next = new Map<string, ResolvedLocation>();
      for (const job of jobs) {
        const coords = await geocodePlace(job.city, job.country);
        if (cancelled || !coords) continue;
        next.set(job.key, { coords, precision: "city" });
      }
      if (!cancelled && next.size > 0) {
        setOverrides((current) => {
          const merged = new Map(current);
          for (const [key, value] of next) merged.set(key, value);
          return merged;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entries, viewer]);

  return overrides;
}
