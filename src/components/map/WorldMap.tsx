import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { Globe2, Minus, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import type { MapPin } from "@/utils/mapPins";
import { isRecordedGradYear } from "@/utils/profile";
import { loadCountryOutlines, type CountryFeature } from "./worldAtlas";

/**
 * The world, drawn once, with a pin per inhabited location.
 *
 * The land geometry is loaded on demand rather than bundled into the main
 * chunk: it is ~40 kB gzipped and only this page needs it, so importing it
 * eagerly would slow the homepage down for everyone who never opens the map.
 *
 * The map is a camera over a fixed projection rather than a static drawing.
 * A phone gives the whole planet about 350 px of width, which is not enough to
 * separate two cities an hour apart — and this school's alumni cluster hard in
 * Kerala and the Gulf. So the view starts framed on the pins and can be panned
 * and pinched, and pin geometry is measured in screen pixels so a pin stays the
 * same size to the eye — and the same size to a fingertip — at every zoom.
 */

/** Projection space. The camera crops into this; it is not the drawn size. */
const VIEW_W = 960;
/** Keeps the coastlines and outermost pins clear of the frame border. */
const PADDING = 6;

const MIN_ZOOM = 1;
/**
 * Deep enough to pull apart towns an hour's drive apart, which is the case that
 * matters here: a school's alumni cluster in neighbouring towns, and two pins
 * 50 km apart are one blob until the view gets down to a few hundred kilometres
 * across. The country outlines are coarse at that range, but the pins — the
 * reason anyone opened the map — are finally distinct.
 */
const MAX_ZOOM = 64;
/**
 * A ceiling on the opening view only. Fitting a lone pin would otherwise zoom
 * to street level, stranding it on a blank rectangle with no context.
 */
const OPENING_MAX_ZOOM = 4;

/**
 * Minimum hit-target diameter. 44 px is Apple's floor for touch; a mouse is
 * precise enough not to need it, but a little slack still helps on small pins.
 */
const TOUCH_TARGET_PX = 44;
const MOUSE_TARGET_PX = 22;

/** Movement past this cancels the tap, so panning never selects a pin. */
const DRAG_SLOP_PX = 8;

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

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the camera is pointed, and how far in. `z` of 1 frames the world. */
interface Camera {
  cx: number;
  cy: number;
  z: number;
}

interface Props {
  pins: MapPin[];
  selectedPinId: string | null;
  onSelectPin: (pinId: string | null) => void;
}

export function WorldMap({ pins, selectedPinId, onSelectPin }: Props) {
  const [land, setLand] = useState<CountryFeature[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const frame = useElementSize(frameRef);
  const coarsePointer = useCoarsePointer();
  const clipId = useId();

  const [camera, setCamera] = useState<Camera | null>(null);

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

  const { pathFor, project, graticulePath, world } = useMemo(() => {
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
      world: {
        x: 0,
        y: 0,
        w: VIEW_W,
        h: Math.round(bounds[1][1] - bounds[0][1]) + PADDING * 2,
      } as Rect,
    };
  }, []);

  // The frame's aspect decides how much of the world a `z` of 1 shows: a phone
  // is close to square, a desktop column is a letterbox.
  const aspect = frame.w && frame.h ? frame.w / frame.h : world.w / world.h;
  const base = useMemo(() => containRect(world, aspect), [world, aspect]);

  const view = useMemo(
    () => rectFor(camera ?? { cx: world.w / 2, cy: world.h / 2, z: 1 }, base),
    [camera, base, world],
  );

  /** Projection units per rendered pixel — the bridge between the two spaces. */
  const unitsPerPx = frame.w ? view.w / frame.w : 1;

  // Re-frame when the set of pins changes (a class filter, or geocoding
  // resolving a city), but not when the user resizes or pans: overriding a
  // deliberate zoom would be worse than a slightly stale frame.
  const pinSignature = pins.map((pin) => pin.id).join("|");
  const framedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!frame.w || !frame.h) return;
    if (framedFor.current === pinSignature) return;
    framedFor.current = pinSignature;

    const points = pins
      .map((pin) => project(pin.coords[0], pin.coords[1]))
      .filter((point): point is [number, number] => point != null);
    setCamera(openingCamera(points, base, world));
  }, [pinSignature, pins, project, base, world, frame.w, frame.h]);

  const moveCamera = useCallback(
    (next: Camera) => setCamera(clampCamera(next, base, world)),
    [base, world],
  );

  /**
   * Pins with their projected position and the distance to their closest
   * neighbour, which is what decides how far a hit area may spread without
   * stealing taps meant for the city next door.
   */
  const placed = useMemo(() => {
    const points: { pin: MapPin; at: [number, number] }[] = [];
    for (const pin of pins) {
      const at = project(pin.coords[0], pin.coords[1]);
      if (at) points.push({ pin, at });
    }
    return points.map((entry, index) => {
      let nearest = Infinity;
      for (let other = 0; other < points.length; other += 1) {
        if (other === index) continue;
        const distance = Math.hypot(
          entry.at[0] - points[other].at[0],
          entry.at[1] - points[other].at[1],
        );
        if (distance < nearest) nearest = distance;
      }
      return { ...entry, nearest };
    });
  }, [pins, project]);

  const selectedPoint = useMemo(() => {
    const pin = pins.find((candidate) => candidate.id === selectedPinId);
    return pin ? project(pin.coords[0], pin.coords[1]) : null;
  }, [pins, selectedPinId, project]);

  const zoomBy = useCallback(
    (factor: number) =>
      setCamera((prev) => {
        const current = prev ?? { cx: world.w / 2, cy: world.h / 2, z: 1 };
        // Zooming about the bare centre of a scattered cohort magnifies the
        // ocean between them. If the reader has picked a city and it is on
        // screen, that is what they are zooming into.
        const onScreen =
          selectedPoint != null &&
          selectedPoint[0] >= view.x &&
          selectedPoint[0] <= view.x + view.w &&
          selectedPoint[1] >= view.y &&
          selectedPoint[1] <= view.y + view.h;

        return clampCamera(
          {
            cx: onScreen ? selectedPoint[0] : current.cx,
            cy: onScreen ? selectedPoint[1] : current.cy,
            z: current.z * factor,
          },
          base,
          world,
        );
      }),
    [base, world, selectedPoint, view],
  );

  const gesture = usePanZoom({ frameRef, base, world, view, moveCamera });

  // Both states highlight a pin, but only hovering pops the tooltip: a selected
  // pin already has the sidebar, and a permanently open tooltip would sit on top
  // of its neighbours. Touch has no hover, so there the tooltip never opens and
  // tapping goes straight to the sidebar.
  const highlightedPinId = hoveredPinId ?? selectedPinId;
  const hoveredPin = coarsePointer
    ? null
    : (pins.find((pin) => pin.id === hoveredPinId) ?? null);
  const hoveredPoint = hoveredPin
    ? project(hoveredPin.coords[0], hoveredPin.coords[1])
    : null;

  // A pin's area, not its radius, should track headcount — otherwise a city with
  // 40 alumni becomes a blob that swallows its neighbours. Sized in pixels so
  // the pin means the same thing on a phone as on a desktop.
  const radiusPx = (count: number) => Math.min(6 + Math.sqrt(count) * 2.2, 17);
  const targetPx = coarsePointer ? TOUCH_TARGET_PX : MOUSE_TARGET_PX;

  const frameClass =
    "relative w-full overflow-hidden rounded-[var(--radius-card)] border border-black/5 bg-white";
  // Taller than the world's own 2.26:1 on a phone, where a full-width strip of
  // the planet is only ~160 px tall — too little to tell two cities apart. Not
  // much taller, though: the extra height is only filled once the view zooms in,
  // so an over-tall frame just banks white space above and below the equator.
  const aspectClass = "aspect-4/3 sm:aspect-[2.26/1]";

  if (loadError) {
    return (
      <div
        className={cn(
          "card flex items-center justify-center p-8 text-center",
          aspectClass,
        )}
      >
        <p className="max-w-sm text-sm text-ink-soft">
          The map could not be loaded. The locations are still listed alongside
          it.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={frameRef}
        className={cn(frameClass, aspectClass, "touch-pan-y select-none")}
        onPointerDown={gesture.onPointerDown}
        onPointerMove={gesture.onPointerMove}
        onPointerUp={gesture.onPointerEnd}
        onPointerCancel={gesture.onPointerEnd}
      >
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="absolute inset-0 size-full"
          // Not role="img": that would make the pins presentational and hide the
          // whole map from assistive technology. A group keeps them reachable.
          role="group"
          aria-label={`Map of alumni locations, ${pins.length} ${pins.length === 1 ? "location" : "locations"}`}
        >
          <defs>
            {/* The projection is fitted to the inhabited latitudes, but the
                geometry itself still runs to both poles. Zooming out past that
                band would otherwise let Antarctica creep into the frame and
                undo the crop the projection was chosen for. */}
            <clipPath id={clipId}>
              <rect
                x={world.x}
                y={world.y}
                width={world.w}
                height={world.h}
              />
            </clipPath>
          </defs>

          <g aria-hidden clipPath={`url(#${clipId})`}>
            <path
              d={graticulePath}
              fill="none"
              stroke="var(--color-paper-deep)"
              strokeWidth={0.5 * unitsPerPx}
            />
            {land?.map((country, index) => (
              <path
                key={country.properties?.name ?? index}
                d={pathFor(country)}
                // Warm sand rather than a neutral grey: the rest of the app is
                // yearbook paper, and a grey map turns it into a dashboard.
                fill="color-mix(in oklab, var(--color-paper-deep) 94%, var(--color-secondary))"
                stroke="white"
                strokeWidth={0.7 * unitsPerPx}
              />
            ))}
          </g>

          {/* Pins are drawn after the land so they are never occluded by it. */}
          <g>
            {placed.map(({ pin, at: [x, y], nearest }) => {
              const isActive = pin.id === highlightedPinId;
              const r = radiusPx(pin.people.length) * unitsPerPx;
              // A finger-sized target where there is room for one, but never
              // past the midpoint to the nearest neighbour: a lone pin in the
              // Pacific can afford 44 px, while two cities an hour apart must
              // each keep to their own half or the tap lands on the wrong one.
              const hit = Math.max(
                r,
                Math.min(nearest / 2, (targetPx / 2) * unitsPerPx),
              );

              return (
                <g key={pin.id} transform={`translate(${x} ${y})`}>
                  {isActive && (
                    <circle
                      r={r + 5 * unitsPerPx}
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
                    strokeWidth={1.5 * unitsPerPx}
                    aria-hidden
                    className="pointer-events-none"
                  />
                  {/* Counts are only legible once the pin is big enough. */}
                  {pin.people.length > 1 && radiusPx(pin.people.length) >= 9 && (
                    <text
                      y={3.5 * unitsPerPx}
                      textAnchor="middle"
                      style={{ fontSize: 10 * unitsPerPx }}
                      className="pointer-events-none fill-white font-semibold"
                      aria-hidden
                    >
                      {pin.people.length}
                    </text>
                  )}
                  {/* An invisible target so a fingertip can hit a small pin. */}
                  <circle
                    r={hit}
                    fill="transparent"
                    // A tap already answers itself — the pin swells and changes
                    // colour, and the sidebar fills in. The browser's square
                    // outline around a round pin is only worth it for the
                    // keyboard, which has no other way to show where it is.
                    className="cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    tabIndex={0}
                    role="button"
                    aria-pressed={pin.id === selectedPinId}
                    aria-label={`${pin.label}: ${pin.people.length} ${
                      pin.people.length === 1 ? "alumnus" : "alumni"
                    }`}
                    onPointerEnter={() => setHoveredPinId(pin.id)}
                    onPointerLeave={() => setHoveredPinId(null)}
                    onFocus={() => setHoveredPinId(pin.id)}
                    onBlur={() => setHoveredPinId(null)}
                    onClick={() => {
                      if (gesture.didPan()) return;
                      onSelectPin(pin.id === selectedPinId ? null : pin.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectPin(pin.id === selectedPinId ? null : pin.id);
                      }
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        <ZoomControls
          onZoomIn={() => zoomBy(1.8)}
          onZoomOut={() => zoomBy(1 / 1.8)}
          onReset={() => moveCamera({ cx: world.w / 2, cy: world.h / 2, z: 1 })}
          canZoomIn={view.w > base.w / MAX_ZOOM + 0.5}
          canZoomOut={view.w < base.w - 0.5}
        />

        {hoveredPin && hoveredPoint && (
          <MapTooltip
            pin={hoveredPin}
            xPercent={((hoveredPoint[0] - view.x) / view.w) * 100}
            yPercent={((hoveredPoint[1] - view.y) / view.h) * 100}
          />
        )}
      </div>

      <p className="mt-2 text-center text-xs text-ink-soft sm:hidden">
        Drag to pan · pinch or use the buttons to zoom · tap a pin for names
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera geometry                                                            */
/* -------------------------------------------------------------------------- */

/** The smallest rect of the given aspect that still contains the world. */
function containRect(world: Rect, aspect: number): Rect {
  const worldAspect = world.w / world.h;
  let { w, h } = world;
  if (aspect > worldAspect) w = world.h * aspect;
  else h = world.w / aspect;
  return {
    x: world.x + (world.w - w) / 2,
    y: world.y + (world.h - h) / 2,
    w,
    h,
  };
}

function rectFor(camera: Camera, base: Rect): Rect {
  const w = base.w / camera.z;
  const h = base.h / camera.z;
  return { x: camera.cx - w / 2, y: camera.cy - h / 2, w, h };
}

/**
 * Keeps the view over the world. Once zoomed out far enough that an axis no
 * longer fills the frame, that axis is centred rather than left to drift.
 */
function clampCamera(camera: Camera, base: Rect, world: Rect): Camera {
  const z = Math.min(Math.max(camera.z, MIN_ZOOM), MAX_ZOOM);
  const w = base.w / z;
  const h = base.h / z;

  const axis = (c: number, span: number, start: number, total: number) =>
    span >= total
      ? start + total / 2
      : Math.min(Math.max(c, start + span / 2), start + total - span / 2);

  return {
    z,
    cx: axis(camera.cx, w, world.x, world.w),
    cy: axis(camera.cy, h, world.y, world.h),
  };
}

/**
 * Frames the pins on open. Alumni concentrated in one region get that region
 * rather than an ocean-heavy world view, and a spread-out cohort still gets the
 * whole planet because the fit can never zoom out past it.
 */
function openingCamera(
  points: [number, number][],
  base: Rect,
  world: Rect,
): Camera {
  const centred = { cx: world.w / 2, cy: world.h / 2, z: 1 };
  if (points.length === 0) return centred;

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Room for the pin glyphs themselves plus breathing space, so an edge pin is
  // never clipped in half by the frame.
  const margin = 0.1;
  const needW = Math.max((maxX - minX) / (1 - margin * 2), base.w / MAX_ZOOM);
  const needH = Math.max((maxY - minY) / (1 - margin * 2), base.h / MAX_ZOOM);

  const z = Math.min(base.w / needW, base.h / needH, OPENING_MAX_ZOOM);
  return clampCamera(
    { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, z },
    base,
    world,
  );
}

/* -------------------------------------------------------------------------- */
/* Interaction                                                                */
/* -------------------------------------------------------------------------- */

/**
 * One finger pans, two fingers pan and zoom together.
 *
 * The frame sets `touch-action: pan-y`, which leaves vertical page scrolling to
 * the browser — a map that swallowed upward swipes would trap the reader
 * halfway down the page. Two-finger dragging is therefore the way to move the
 * view vertically, which is also how every native map behaves.
 */
function usePanZoom({
  frameRef,
  base,
  world,
  view,
  moveCamera,
}: {
  frameRef: React.RefObject<HTMLDivElement | null>;
  base: Rect;
  world: Rect;
  view: Rect;
  moveCamera: (camera: Camera) => void;
}) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{
    distance: number;
    z: number;
    anchor: { x: number; y: number };
  } | null>(null);
  const travelled = useRef(0);
  const captured = useRef(false);

  // The handlers run from event callbacks, so they read geometry from a ref
  // rather than closing over a render's values.
  const latest = useRef({ base, world, view });
  useEffect(() => {
    latest.current = { base, world, view };
  }, [base, world, view]);

  const frameRect = () => frameRef.current?.getBoundingClientRect() ?? null;

  const centroid = () => {
    const points = [...pointers.current.values()];
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  };

  const spread = () => {
    const points = [...pointers.current.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  /** The projection-space point currently under a client position. */
  const toUnits = (client: { x: number; y: number }) => {
    const rect = frameRect();
    const { view: v } = latest.current;
    if (!rect) return { x: v.x + v.w / 2, y: v.y + v.h / 2 };
    return {
      x: v.x + ((client.x - rect.left) / rect.width) * v.w,
      y: v.y + ((client.y - rect.top) / rect.height) * v.h,
    };
  };

  const beginGesture = () => {
    const { base: b, view: v } = latest.current;
    start.current = {
      distance: spread(),
      z: b.w / v.w,
      anchor: toUnits(centroid()),
    };
  };

  return {
    /** True if the pointer travelled far enough that this was a pan, not a tap. */
    didPan: () => travelled.current > DRAG_SLOP_PX,

    onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      // Let the zoom buttons be buttons.
      if ((event.target as Element).closest("[data-map-control]")) return;

      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      travelled.current = 0;
      captured.current = false;
      beginGesture();
    },

    onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      const previous = pointers.current.get(event.pointerId);
      if (!previous || !start.current) return;

      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      travelled.current += Math.hypot(
        event.clientX - previous.x,
        event.clientY - previous.y,
      );
      if (travelled.current <= DRAG_SLOP_PX) return;

      const rect = frameRect();
      if (!rect) return;

      // Capture only once this is unmistakably a drag. Capturing on pointerdown
      // would retarget the click to the frame, and every tap on a pin would be
      // swallowed by the pan handler instead of selecting the city.
      if (!captured.current) {
        captured.current = true;
        for (const id of pointers.current.keys()) {
          try {
            frameRef.current?.setPointerCapture(id);
          } catch {
            // The pointer may already be gone; panning continues regardless.
          }
        }
      }

      const { base: b } = latest.current;
      const distance = spread();
      const zoom =
        start.current.distance > 0 && distance > 0
          ? (start.current.z * distance) / start.current.distance
          : start.current.z;

      // Hold the point the fingers grabbed underneath them, which makes the
      // gesture feel attached to the map instead of nudging it.
      const at = centroid();
      const nextW = b.w / zoom;
      const nextH = b.h / zoom;
      const fx = (at.x - rect.left) / rect.width - 0.5;
      const fy = (at.y - rect.top) / rect.height - 0.5;

      moveCamera({
        cx: start.current.anchor.x - fx * nextW,
        cy: start.current.anchor.y - fy * nextH,
        z: zoom,
      });
    },

    onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
      pointers.current.delete(event.pointerId);
      // Lifting one finger of a pinch re-bases the gesture on what is left, so
      // the view does not jump when the grip changes.
      if (pointers.current.size > 0) {
        beginGesture();
      } else {
        start.current = null;
        captured.current = false;
      }
    },
  };
}

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}) {
  const button =
    "flex size-11 items-center justify-center bg-white/95 text-ink transition hover:bg-brand-soft/60 disabled:cursor-not-allowed disabled:text-ink-soft/40 disabled:hover:bg-white/95";

  return (
    <div
      data-map-control
      // Bottom left is the South Pacific: the emptiest corner of the frame, and
      // so the one least likely to cover somebody's pin.
      className="absolute bottom-2 left-2 flex flex-col divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 shadow-sm"
    >
      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className={button}
        aria-label="Zoom in"
      >
        <Plus className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className={button}
        aria-label="Zoom out"
      >
        <Minus className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onReset}
        className={button}
        aria-label="Show the whole world"
      >
        <Globe2 className="size-5" aria-hidden />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setSize({ w: box.width, h: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

/** Touch and stylus input, which needs bigger targets and has no hover. */
function useCoarsePointer(): boolean {
  const query = "(pointer: coarse)";
  const [coarse, setCoarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCoarse(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return coarse;
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
      // The SVG fills its frame with no letterboxing, so a percentage offset
      // tracks the pin at every viewport width and zoom level.
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
              <span className="text-ink-soft">
                {isRecordedGradYear(person.gradYear)
                  ? ` · ${person.gradYear}`
                  : ""}
              </span>
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
