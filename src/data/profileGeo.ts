import { geocodePlace } from "@/data/geocode";
import { resolveLocation } from "@/data/geo";

export async function resolveProfileGeo(
  city: string | undefined,
  country: string | undefined,
): Promise<{ lat: number; lon: number } | null> {
  if (!city) return null;
  const known = resolveLocation(city, country);
  if (known?.precision === "city") {
    return { lat: known.coords[0], lon: known.coords[1] };
  }
  const found = await geocodePlace(city, country);
  return found ? { lat: found[0], lon: found[1] } : null;
}
