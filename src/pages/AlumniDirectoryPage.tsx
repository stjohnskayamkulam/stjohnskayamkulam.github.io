import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, UserSearch, X } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  getClassInfo,
  getDirectoryFacets,
  listClassYears,
  searchAlumni,
} from "@/services/alumniService";
import { listEvents } from "@/services/eventService";
import { AlumniCard } from "@/components/alumni/AlumniCard";
import { ClassBanner, ClassNotices } from "@/components/alumni/ClassSpotlight";
import { MyClassButton } from "@/components/alumni/MyClassButton";
import { SelectField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/States";
import { HELP_OFFER_LABELS, type AlumniFilters, type HelpOffer } from "@/types";

/** Filters live in the URL so a search can be shared or bookmarked. */
const FILTER_KEYS = [
  "q",
  "year",
  "batch",
  "city",
  "country",
  "profession",
  "industry",
  "company",
  "help",
] as const;

export function AlumniDirectoryPage() {
  const [params, setParams] = useSearchParams();
  const { session } = useAuth();
  const [showFilters, setShowFilters] = useState(false);

  const [queryInput, setQueryInput] = useState(params.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(queryInput, 300);

  const filters = useMemo<AlumniFilters>(
    () => ({
      query: debouncedQuery || undefined,
      gradYear: params.get("year") ? Number(params.get("year")) : null,
      batch: params.get("batch") ?? undefined,
      city: params.get("city") ?? undefined,
      country: params.get("country") ?? undefined,
      profession: params.get("profession") ?? undefined,
      industry: params.get("industry") ?? undefined,
      company: params.get("company") ?? undefined,
      helpOffer: (params.get("help") as HelpOffer | null) ?? null,
    }),
    [debouncedQuery, params],
  );

  const facets = useAsync(() => getDirectoryFacets(), []);
  const results = useAsync(
    () => searchAlumni(filters),
    [JSON.stringify(filters)],
  );

  // A selected year turns the directory into that class's home: the roster is
  // still the result grid, joined by the aggregates a grid cannot show.
  const year = filters.gradYear ?? null;
  const isMyClass = year !== null && year === session?.profile?.gradYear;
  const classInfo = useAsync(
    () => (year ? getClassInfo(year) : Promise.resolve(null)),
    [year],
  );
  const classEvents = useAsync(
    () => (year ? listEvents({ classYear: year }) : Promise.resolve([])),
    [year],
  );
  const classYears = useAsync(() => listClassYears(), []);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function clearAll() {
    setQueryInput("");
    setParams(new URLSearchParams(), { replace: true });
  }

  const activeCount = FILTER_KEYS.filter((key) => params.get(key)).length;

  return (
    <div className="section py-12">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          Who do I know?
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Alumni directory
        </h1>
        <p className="mt-3 text-ink-soft">
          Search by name, or narrow by year, city and profession to find the
          people you have been meaning to look up. Pick a graduating year to see
          that whole class together.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            type="search"
            value={queryInput}
            onChange={(e) => {
              setQueryInput(e.target.value);
              setFilter("q", e.target.value);
            }}
            placeholder="Search by name, company, city…"
            aria-label="Search alumni"
            className="w-full rounded-full border border-black/10 bg-white py-3 pr-4 pl-10 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>

        <MyClassButton
          activeYear={year}
          onSelectYear={(next) => setFilter("year", next ? String(next) : "")}
        />

        <Button
          variant="outline"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-brand px-1.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </Button>

        {activeCount > 0 && (
          <Button variant="ghost" onClick={clearAll}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="card mb-8 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Graduation year"
            value={params.get("year") ?? ""}
            onChange={(e) => setFilter("year", e.target.value)}
          >
            <option value="">Any year</option>
            {facets.data?.gradYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Class / batch"
            value={params.get("batch") ?? ""}
            onChange={(e) => setFilter("batch", e.target.value)}
          >
            <option value="">Any batch</option>
            {facets.data?.batches.map((batch) => (
              <option key={batch} value={batch}>
                {batch}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="City"
            value={params.get("city") ?? ""}
            onChange={(e) => setFilter("city", e.target.value)}
          >
            <option value="">Anywhere</option>
            {facets.data?.cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Country"
            value={params.get("country") ?? ""}
            onChange={(e) => setFilter("country", e.target.value)}
          >
            <option value="">Anywhere</option>
            {facets.data?.countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Profession"
            value={params.get("profession") ?? ""}
            onChange={(e) => setFilter("profession", e.target.value)}
          >
            <option value="">Any profession</option>
            {facets.data?.professions.map((profession) => (
              <option key={profession} value={profession}>
                {profession}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Industry"
            value={params.get("industry") ?? ""}
            onChange={(e) => setFilter("industry", e.target.value)}
          >
            <option value="">Any industry</option>
            {facets.data?.industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Company"
            value={params.get("company") ?? ""}
            onChange={(e) => setFilter("company", e.target.value)}
          >
            <option value="">Any company</option>
            {facets.data?.companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Willing to help with"
            value={params.get("help") ?? ""}
            onChange={(e) => setFilter("help", e.target.value)}
          >
            <option value="">Anything</option>
            {Object.entries(HELP_OFFER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      {year !== null && (
        <ClassBanner
          year={year}
          memberCount={classInfo.data?.memberCount}
          nextReunionYear={classInfo.data?.nextReunionYear}
          years={classYears.data ?? []}
          isMyClass={isMyClass}
          onSelectYear={(next) => setFilter("year", String(next))}
        />
      )}

      {results.error ? (
        <ErrorState error={results.error} onRetry={results.reload} />
      ) : results.loading ? (
        <SkeletonGrid count={9} />
      ) : results.data && results.data.length > 0 ? (
        <>
          <p className="mb-5 text-sm text-ink-soft" role="status">
            {results.data.length}{" "}
            {results.data.length === 1 ? "alumnus" : "alumni"} found
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.data.map((person) => (
              <AlumniCard key={person.uid} person={person} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<UserSearch className="size-8" />}
          title={
            year !== null && activeCount === 1
              ? `Nobody from ${year} yet`
              : "Nobody matches that search"
          }
          description={
            year !== null && activeCount === 1
              ? "If you were in this year, yours could be the profile that starts it off."
              : "Try a broader search, or clear the filters and browse by graduating year instead."
          }
          action={
            <Button variant="outline" onClick={clearAll} className="mt-2">
              Clear filters
            </Button>
          }
        />
      )}

      {year !== null && (
        <ClassNotices
          announcements={classInfo.data?.announcements ?? []}
          events={classEvents.data ?? []}
        />
      )}
    </div>
  );
}
