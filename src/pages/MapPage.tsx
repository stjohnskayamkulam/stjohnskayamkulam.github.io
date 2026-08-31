import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EyeOff, Globe2, MapPin, X } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { listClassYears, searchAlumni } from "@/services/alumniService";
import { WorldMap } from "@/components/map/WorldMap";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { buildMapPins, countriesFromPins, type MapPin as Pin } from "@/utils/mapPins";
import { useGeocodedPlaces } from "@/hooks/useGeocodedPlaces";
import { classOfLabel } from "@/utils/profile";
import type { Viewer } from "@/utils/visibility";

/**
 * Where everyone ended up.
 *
 * The map answers a question the directory's list view cannot: not "who is in
 * Toronto" but "how far did we scatter". Filtering by class turns it into the
 * question people actually ask at reunions — where did *my* year go?
 */
export function MapPage() {
  const [params, setParams] = useSearchParams();
  const { session, isAdmin } = useAuth();
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const yearParam = params.get("year");
  const gradYear = yearParam ? Number(yearParam) : null;

  const classYears = useAsync(() => listClassYears(), []);
  // The whole cohort is fetched once and filtered in memory: the map needs every
  // pin at once anyway, and re-querying on each filter change would make the
  // pins flicker for no benefit.
  const alumni = useAsync(() => searchAlumni({}), []);

  const viewer = useMemo<Viewer>(
    () => ({
      uid: session?.account.uid,
      gradYear: session?.profile?.gradYear,
      isAdmin,
      isSignedIn: Boolean(session),
    }),
    [session, isAdmin],
  );

  const geocoded = useGeocodedPlaces(alumni.data, viewer);

  const { pins, unplaced, totalPlaced } = useMemo(() => {
    const entries = (alumni.data ?? []).filter(
      (person) => gradYear == null || person.gradYear === gradYear,
    );
    const result = buildMapPins(entries, viewer, geocoded);
    return {
      ...result,
      totalPlaced: result.pins.reduce((sum, pin) => sum + pin.people.length, 0),
    };
  }, [alumni.data, gradYear, viewer, geocoded]);

  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? null;

  // Stacked single-column, the names sit below the map and off the screen, so a
  // tap on a pin would look like it did nothing. Bring them to the reader.
  const detailsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selectedPinId) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedPinId]);

  function setYear(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("year", value);
    else next.delete("year");
    setParams(next, { replace: true });
    // The previous selection may not exist in the new filter's pins.
    setSelectedPinId(null);
  }

  return (
    <div className="section py-12">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          Where did everyone go?
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Alumni around the world
        </h1>
        <p className="mt-3 text-ink-soft">
          Every pin is a city someone from the school now calls home. Tap or
          hover a pin to see who is there, or pick a graduating year to follow
          one class across the map.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <SelectField
            label="Graduating class"
            value={yearParam ?? ""}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="">All classes</option>
            {classYears.data?.map(({ year, memberCount }) => (
              <option key={year} value={year}>
                Class of {year} ({memberCount})
              </option>
            ))}
          </SelectField>
        </div>

        {gradYear != null && (
          <Button variant="ghost" onClick={() => setYear("")}>
            <X className="size-4" aria-hidden />
            All classes
          </Button>
        )}
      </div>

      {alumni.error ? (
        <ErrorState error={alumni.error} onRetry={alumni.reload} />
      ) : alumni.loading ? (
        <LoadingBlock label="Placing everyone on the map…" />
      ) : pins.length === 0 ? (
        <EmptyState
          icon={<Globe2 className="size-8" />}
          title={
            gradYear != null
              ? `Nobody from the Class of ${gradYear} has shared a location`
              : "No locations to show yet"
          }
          description="Members appear here once they add a city to their profile and choose to share it."
          action={
            gradYear != null ? (
              <Button
                variant="outline"
                onClick={() => setYear("")}
                className="mt-2"
              >
                Show all classes
              </Button>
            ) : (
              <Link
                to="/profile"
                className="mt-2 text-sm text-brand hover:underline"
              >
                Add your own location
              </Link>
            )
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-soft" role="status">
            {totalPlaced} {totalPlaced === 1 ? "alumnus" : "alumni"} across{" "}
            {pins.length} {pins.length === 1 ? "location" : "locations"}
            {gradYear != null && ` · Class of ${gradYear}`}
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WorldMap
                pins={pins}
                selectedPinId={selectedPinId}
                onSelectPin={setSelectedPinId}
              />
              <UnplacedNote unplaced={unplaced} />
            </div>

            <aside
              ref={detailsRef}
              className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
            >
              <CountryList
                pins={pins}
                onSelectCountry={(country) => {
                  const match = pins.find((pin) => pin.country === country);
                  if (match) setSelectedPinId(match.id);
                }}
              />
              {selectedPin ? (
                <SelectedLocation
                  pin={selectedPin}
                  onClear={() => setSelectedPinId(null)}
                />
              ) : (
                <TopLocations pins={pins} onSelect={setSelectedPinId} />
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A map that silently omits people is worse than no map, because it looks
 * complete. This says out loud who is missing and why.
 */
function UnplacedNote({
  unplaced,
}: {
  unplaced: { hidden: number; unknown: number };
}) {
  const total = unplaced.hidden + unplaced.unknown;
  if (total === 0) return null;

  const reasons = [
    unplaced.hidden > 0 && `${unplaced.hidden} keep their location private`,
    unplaced.unknown > 0 &&
      `${unplaced.unknown} list a place the map does not recognise`,
  ].filter(Boolean);

  return (
    <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
      <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        {total} {total === 1 ? "member is" : "members are"} not shown:{" "}
        {reasons.join(", ")}.
      </span>
    </p>
  );
}

function SelectedLocation({ pin, onClear }: { pin: Pin; onClear: () => void }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold text-ink">
            <MapPin className="size-4 text-brand" aria-hidden />
            {pin.label}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {pin.people.length} {pin.people.length === 1 ? "alumnus" : "alumni"}
            {pin.precision === "country" && " · city not shared"}
          </p>
        </div>
        <button
          onClick={onClear}
          className="rounded-full p-1.5 text-ink-soft hover:bg-black/5"
          aria-label="Clear selected location"
        >
          <X className="size-4" />
        </button>
      </div>

      <ul className="mt-4 max-h-80 divide-y divide-black/5 overflow-y-auto overscroll-contain">
        {pin.people.map((person) => (
          <li key={person.uid} className="py-3 first:pt-0 last:pb-0">
            <Link
              to={`/alumni/${person.uid}`}
              className="group flex items-center gap-3 hover:text-brand"
            >
              <Avatar name={person.fullName} src={person.photoURL} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {person.fullName}
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  {[classOfLabel(person.gradYear), person.profession]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shown until a pin is picked — every place on the map, scrollable. */
function TopLocations({
  pins,
  onSelect,
}: {
  pins: Pin[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-ink">Where alumni are</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Select a place to see who is there.
      </p>
      <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto overscroll-contain">
        {pins.map((pin) => (
          <li key={pin.id}>
            <button
              onClick={() => onSelect(pin.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-brand-soft/40"
            >
              <span className="min-w-0 truncate">{pin.label}</span>
              <span className="shrink-0 text-xs font-medium text-ink-soft">
                {pin.people.length}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountryList({
  pins,
  onSelectCountry,
}: {
  pins: Pin[];
  onSelectCountry: (country: string) => void;
}) {
  const countries = countriesFromPins(pins);
  if (countries.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-ink">Countries</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Every country with someone on the map.
      </p>
      <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto overscroll-contain">
        {countries.map(({ country, count }) => (
          <li key={country}>
            <button
              type="button"
              onClick={() => onSelectCountry(country)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-brand-soft/40"
            >
              <span className="min-w-0 truncate">{country}</span>
              <span className="shrink-0 text-xs font-medium text-ink-soft">
                {count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
