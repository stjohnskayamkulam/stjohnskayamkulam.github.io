import {
  canonicalCountry,
  interpretPlace,
  placeLookupKey,
  type LatLon,
} from "./geo";

/**
 * Looks up a city the gazetteer does not know, using Open-Meteo's free
 * geocoding API (no key, CORS-friendly). Results are cached so the map does
 * not re-query the same town on every visit.
 */

const memory = new Map<string, LatLon | null>();

interface GeocodeHit {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
}

interface GeocodeResponse {
  results?: GeocodeHit[];
}

// Bumped when the lookup rules change, so an already-open tab cannot keep
// serving a coordinate the current rules would reject.
const STORAGE_PREFIX = "alumni-geo:v2:";

function readStored(key: string): LatLon | null | undefined {
  if (import.meta.env.MODE === "test") return undefined;
  if (typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return undefined;
    if (raw === "null") return null;
    const parsed = JSON.parse(raw) as LatLon;
    if (!Array.isArray(parsed) || parsed.length !== 2) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: LatLon | null) {
  if (import.meta.env.MODE === "test") return;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + key,
      value == null ? "null" : JSON.stringify(value),
    );
  } catch {
    // Quota or private mode — memory cache still works for this session.
  }
}

/**
 * A hit in a country the member did not name is worse than no hit at all: the
 * pin reads as fact and puts them on the wrong continent. GeoNames knows a
 * "Cochin" in Saskatchewan and none in India, so an unmatched country has to
 * give up here and let the caller fall back to the country centroid.
 */
function pickHit(hits: GeocodeHit[], countryKey: string): GeocodeHit | undefined {
  if (!hits.length) return undefined;
  if (!countryKey) return hits[0];
  return hits.find((hit) => canonicalCountry(hit.country) === countryKey);
}

export async function geocodePlace(
  city: string | undefined | null,
  country: string | undefined | null,
): Promise<LatLon | null> {
  const place = interpretPlace(city, country);
  if (!place.city) return null;

  const key = placeLookupKey(place.city, place.country);
  if (memory.has(key)) return memory.get(key) ?? null;

  const stored = readStored(key);
  if (stored !== undefined) {
    memory.set(key, stored);
    return stored;
  }

  const params = new URLSearchParams({
    name: place.city,
    count: "5",
    language: "en",
    format: "json",
  });

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    );
    if (!response.ok) {
      memory.set(key, null);
      return null;
    }
    const body = (await response.json()) as GeocodeResponse;
    const hit = pickHit(body.results ?? [], canonicalCountry(place.country));
    const coords: LatLon | null = hit
      ? [hit.latitude, hit.longitude]
      : null;
    memory.set(key, coords);
    writeStored(key, coords);
    return coords;
  } catch {
    memory.set(key, null);
    return null;
  }
}

/** Test hook — the cache would otherwise leak across cases. */
export function resetGeocodeCache() {
  memory.clear();
}
