import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { cn } from "@/utils/cn";
import type { MapPin } from "@/utils/mapPins";
import { loadCountryOutlines, type CountryFeature } from "./worldAtlas";

/**
 * The world, drawn once, with a pin per inhabited location.
 *
 * The land geometry is loaded on demand rather than bundled into the main
 * chunk: it is ~40 kB gzipped and only this page needs it, so importing it
 * eagerly would slow the homepage down for everyone who never opens the map.
 */

const VIEW_W = 960;
/** Keeps the coastlines and outermost pins clear of the frame border. */
const PADDING = 6;

/**
 * The inhabited latitudes. Fitting the projection to this instead of the whole
 * globe crops Antarctica and the empty far north, reclaiming roughly a fifth of
 * the frame — which goes into making the populated latitudes, and the pins on
 * them, bigger.
 */
const INHABITED_WORLD: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-180, -57],
      [180, -57],
      [180, 83],
      [-180, 83],
      [-180, -57],
    ],
  ],
};

interface Props {
  pins: MapPin[];
  selectedPinId: string | null;
  onSelectPin: (pinId: string | null) => void;
}

export function WorldMap({ pins, selectedPinId, onSelectPin }: Props) {
  const [land, setLand] = useState<CountryFeature[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCountryOutlines().then(
      (features) => {
        if (!cancelled) setLand(features);
      },
      () => {
        if (!cancelled) setLoadError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const { pathFor, project, graticulePath, viewHeight } = useMemo(() => {
    const projection = geoEqualEarth().fitWidth(
      VIEW_W - PADDING * 2,
      INHABITED_WORLD,
    );

    // Fitting by width leaves the vertical placement arbitrary, so measure the
    // result and both shift it into the frame and size the frame to match. That
    // avoids the letterboxing `fitExtent` would leave above and below.
    const bounds = geoPath(projection).bounds(INHABITED_WORLD);
    const [x, y] = projection.translate();
    projection.translate([
      x + (PADDING - bounds[0][0]),
      y + (PADDING - bounds[0][1]),
    ]);

    const path = geoPath(projection);
    return {
      pathFor: (f: CountryFeature) => path(f) ?? "",
      project: (lat: number, lon: number) => projection([lon, lat]),
      graticulePath: path(geoGraticule10()) ?? "",
      viewHeight: Math.round(bounds[1][1] - bounds[0][1]) + PADDING * 2,
    };
  }, []);

  // Both states highlight a pin, but only hovering pops the tooltip: a selected
  // pin already has the sidebar, and a permanently open tooltip would sit on top
  // of its neighbours.
  const highlightedPinId = hoveredPinId ?? selectedPinId;
  const hoveredPin = pins.find((pin) => pin.id === hoveredPinId) ?? null;
  const hoveredPoint = hoveredPin
    ? project(hoveredPin.coords[0], hoveredPin.coords[1])
    : null;

  // A pin's area, not its radius, should track headcount — otherwise a city with
  // 40 alumni becomes a blob that swallows its neighbours.
  const radiusFor = (count: number) =>
    Math.min(4.5 + Math.sqrt(count) * 2.6, 20);

  if (loadError) {
    return (
      <div className="card flex aspect-2/1 items-center justify-center p-8 text-center">
        <p className="max-w-sm text-sm text-ink-soft">
          The map could not be loaded. The locations are still listed alongside
          it.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${viewHeight}`}
        className="w-full rounded-[var(--radius-card)] border border-black/5 bg-white"
        // Not role="img": that would make the pins presentational and hide the
        // whole map from assistive technology. A group keeps them reachable.
        role="group"
        aria-label={`Map of alumni locations, ${pins.length} ${pins.length === 1 ? "location" : "locations"}`}
      >
        <g aria-hidden>
          <path
            d={graticulePath}
            fill="none"
            stroke="var(--color-paper-deep)"
            strokeWidth={0.4}
          />
          {land?.map((country, index) => (
            <path
              key={country.properties?.name ?? index}
              d={pathFor(country)}
              // Warm sand rather than a neutral grey: the rest of the app is
              // yearbook paper, and a grey map turns it into a dashboard.
              fill="color-mix(in oklab, var(--color-paper-deep) 94%, var(--color-secondary))"
              stroke="white"
              strokeWidth={0.6}
            />
          ))}
        </g>

        {/* Pins are drawn after the land so they are never occluded by it. */}
        <g>
          {pins.map((pin) => {
            const point = project(pin.coords[0], pin.coords[1]);
            if (!point) return null;
            const [x, y] = point;
            const isActive = pin.id === highlightedPinId;
            const r = radiusFor(pin.people.length);

            return (
              <g
                key={pin.id}
                transform={`translate(${x} ${y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPinId(pin.id)}
                onMouseLeave={() => setHoveredPinId(null)}
              >
                {isActive && (
                  <circle
                    r={r + 5}
                    fill="var(--color-brand)"
                    opacity={0.16}
                    aria-hidden
                  />
                )}
                <circle
                  r={r}
                  fill={
                    isActive ? "var(--color-secondary)" : "var(--color-brand)"
                  }
                  fillOpacity={0.85}
                  stroke="white"
                  strokeWidth={1.5}
                  tabIndex={0}
                  role="button"
                  aria-pressed={pin.id === selectedPinId}
                  aria-label={`${pin.label}: ${pin.people.length} ${
                    pin.people.length === 1 ? "alumnus" : "alumni"
                  }`}
                  onFocus={() => setHoveredPinId(pin.id)}
                  onBlur={() => setHoveredPinId(null)}
                  onClick={() =>
                    onSelectPin(pin.id === selectedPinId ? null : pin.id)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectPin(pin.id === selectedPinId ? null : pin.id);
                    }
                  }}
                />
                {/* Counts are only legible once the pin is big enough to hold them. */}
                {pin.people.length > 1 && r >= 9 && (
                  <text
                    y={3.5}
                    textAnchor="middle"
                    className="pointer-events-none fill-white text-[9px] font-semibold"
                    aria-hidden
                  >
                    {pin.people.length}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hoveredPin && hoveredPoint && (
        <MapTooltip
          pin={hoveredPin}
          xPercent={(hoveredPoint[0] / VIEW_W) * 100}
          yPercent={(hoveredPoint[1] / viewHeight) * 100}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Names shown on hover before the list is truncated. */
const TOOLTIP_NAME_LIMIT = 6;

function MapTooltip({
  pin,
  xPercent,
  yPercent,
}: {
  pin: MapPin;
  xPercent: number;
  yPercent: number;
}) {
  const shown = pin.people.slice(0, TOOLTIP_NAME_LIMIT);
  const remaining = pin.people.length - shown.length;
  // Pins in the northern third have no room above them, so the card drops below
  // instead of spilling out over the page controls.
  const below = yPercent < 38;

  return (
    <div
      // The SVG scales with its container and has no letterboxing, so a
      // percentage offset tracks the pin at every viewport width.
      style={{
        left: `${Math.min(Math.max(xPercent, 12), 88)}%`,
        top: `${yPercent}%`,
      }}
      className={cn(
        "pointer-events-none absolute z-10 w-56 -translate-x-1/2",
        below ? "pt-3" : "-translate-y-full pb-3",
      )}
      role="tooltip"
    >
      <div className="card p-3.5 text-left shadow-lg">
        <p className="text-sm font-semibold text-ink">{pin.label}</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {pin.people.length} {pin.people.length === 1 ? "alumnus" : "alumni"}
          {pin.precision === "country" && " · city not shared"}
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {shown.map((person) => (
            <li key={person.uid} className="text-xs leading-snug">
              <span className="font-medium text-ink">{person.fullName}</span>
              <span className="text-ink-soft"> · {person.gradYear}</span>
              {person.profession && (
                <span className="block text-ink-soft">
                  {person.profession}
                  {person.company && ` · ${person.company}`}
                </span>
              )}
            </li>
          ))}
        </ul>
        {remaining > 0 && (
          <p className="mt-2 text-xs text-ink-soft">
            +{remaining} more — click to see all
          </p>
        )}
      </div>
    </div>
  );
}
