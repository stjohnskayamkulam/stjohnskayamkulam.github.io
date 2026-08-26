import type { Feature, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

type CountryProperties = { name: string };

/**
 * Loads country outlines for the alumni map.
 *
 * Kept in its own module for two reasons: the dynamic imports keep ~40 kB of
 * gzipped geometry out of the main bundle, and TypeScript infers a uselessly
 * literal type for a large imported JSON file, so the one necessary cast is
 * confined here instead of leaking into the component.
 */

export type CountryFeature = Feature<Geometry, CountryProperties>;

export async function loadCountryOutlines(): Promise<CountryFeature[]> {
  const [{ feature }, atlas] = await Promise.all([
    import("topojson-client"),
    import("world-atlas/countries-110m.json"),
  ]);

  const topology = (atlas.default ?? atlas) as unknown as Topology;
  const countries = topology.objects
    .countries as GeometryCollection<CountryProperties>;
  return feature(topology, countries).features;
}
