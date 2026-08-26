import {
  interpretPlace,
  placeLookupKey,
  resolveLocation,
  type LatLon,
  type LocationPrecision,
  type ResolvedLocation,
} from "@/data/geo";
import type { DirectoryEntry } from "@/types";
import { canSeeField, type Viewer } from "./visibility";

/**
 * Turns directory entries into map pins.
 *
 * Two rules matter more than the geometry:
 *
 * 1. **Privacy is applied before placing anyone.** A pin is a stronger
 *    disclosure than a line of text — it is precise, it is scannable, and it
 *    sits next to everyone else's. So a member who hid their city is never
 *    plotted at city precision, and one who hid both city and country is not
 *    plotted at all.
 * 2. **Nobody vanishes quietly.** Members who cannot be placed are returned in
 *    `unplaced` so the page can say so, instead of showing a map that quietly
 *    under-counts the community.
 */

export interface MapPerson {
  uid: string;
  fullName: string;
  gradYear: number;
  photoURL?: string | null;
  profession?: string;
  company?: string;
  /** Pre-formatted for display, already filtered for visibility. */
  locationLabel: string;
}

export interface MapPin {
  /** Stable key: the resolved coordinate, which is what actually groups people. */
  id: string;
  coords: LatLon;
  precision: LocationPrecision;
  /** e.g. "Bengaluru, India", or just "India" for a country-level pin. */
  label: string;
  people: MapPerson[];
}

export interface PinBuildResult {
  pins: MapPin[];
  /** Members excluded because their location is hidden or unrecognised. */
  unplaced: { hidden: number; unknown: number };
}

function displayLocation(
  city: string | undefined,
  country: string | undefined,
): string {
  return [city, country].filter(Boolean).join(", ");
}

function resolvePin(
  person: DirectoryEntry,
  city: string | undefined,
  country: string | undefined,
  geocoded: Map<string, ResolvedLocation>,
): ResolvedLocation | null {
  if (
    city &&
    person.geo &&
    Number.isFinite(person.geo.lat) &&
    Number.isFinite(person.geo.lon)
  ) {
    return {
      coords: [person.geo.lat, person.geo.lon],
      precision: "city",
    };
  }

  const resolved = resolveLocation(city, country);
  if (resolved?.precision === "city") return resolved;

  if (city) {
    const extra = geocoded.get(placeLookupKey(city, country));
    if (extra) return extra;
  }

  return resolved;
}

export function buildMapPins(
  entries: DirectoryEntry[],
  viewer: Viewer,
  geocoded: Map<string, ResolvedLocation> = new Map(),
): PinBuildResult {
  const byCoords = new Map<string, MapPin>();
  let hidden = 0;
  let unknown = 0;

  for (const person of entries) {
    const city = canSeeField(person, "city", viewer) ? person.city : undefined;
    const country = canSeeField(person, "country", viewer)
      ? person.country
      : undefined;

    if (!city && !country) {
      hidden += 1;
      continue;
    }

    const resolved = resolvePin(person, city, country, geocoded);
    if (!resolved) {
      unknown += 1;
      continue;
    }

    const place = interpretPlace(city, country);
    const id = `${resolved.coords[0]},${resolved.coords[1]}`;
    const label =
      resolved.precision === "city"
        ? displayLocation(place.city || city, place.country || country)
        : (place.country || country || "");

    const entry: MapPerson = {
      uid: person.uid,
      fullName: person.fullName,
      gradYear: person.gradYear,
      photoURL: person.photoURL,
      profession: canSeeField(person, "profession", viewer)
        ? person.profession
        : undefined,
      company: canSeeField(person, "company", viewer)
        ? person.company
        : undefined,
      locationLabel: label,
    };

    const existing = byCoords.get(id);
    if (existing) {
      existing.people.push(entry);
      // A city-precision match is more informative than a country centroid that
      // happens to collide with it, so let the better label win.
      if (existing.precision === "country" && resolved.precision === "city") {
        existing.precision = "city";
        existing.label = label;
      }
    } else {
      byCoords.set(id, {
        id,
        coords: resolved.coords,
        precision: resolved.precision,
        label,
        people: [entry],
      });
    }
  }

  const pins = [...byCoords.values()].sort(
    (a, b) =>
      b.people.length - a.people.length || a.label.localeCompare(b.label),
  );

  // Newest classes first within a pin, matching the directory's ordering.
  for (const pin of pins) {
    pin.people.sort(
      (a, b) => b.gradYear - a.gradYear || a.fullName.localeCompare(b.fullName),
    );
  }

  return { pins, unplaced: { hidden, unknown } };
}
