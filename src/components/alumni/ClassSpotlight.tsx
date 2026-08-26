import { CalendarHeart, Megaphone, Users } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatRelative, yearsSince } from "@/utils/date";
import type { ClassAnnouncement, SchoolEvent } from "@/types";

/**
 * Class context shown above the directory results whenever a single graduating
 * year is selected — the aggregates that a plain member grid cannot convey.
 */
export function ClassBanner({
  year,
  memberCount,
  nextReunionYear,
  years,
  isMyClass,
  onSelectYear,
}: {
  year: number;
  memberCount?: number;
  nextReunionYear?: number;
  years: { year: number; memberCount: number }[];
  isMyClass: boolean;
  onSelectYear: (year: number) => void;
}) {
  return (
    <section
      aria-label={`Class of ${year}`}
      className="paper-grain mb-8 rounded-2xl bg-brand p-6 text-white sm:p-7"
    >
      <p className="text-xs font-semibold tracking-[0.24em] text-accent uppercase">
        {isMyClass ? "My class" : "Graduating class"}
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
        Class of {year}
      </h2>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/85">
        <span className="inline-flex items-center gap-2">
          <Users className="size-4" aria-hidden />
          {memberCount ?? "—"} members on the network
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarHeart className="size-4" aria-hidden />
          {yearsSince(year)} years since graduation
        </span>
        {nextReunionYear && (
          <span>Next milestone reunion: {nextReunionYear}</span>
        )}
      </div>

      {years.length > 0 && (
        <div className="mt-6">
          <p className="mb-2.5 text-xs tracking-wide text-white/60 uppercase">
            Jump to another year
          </p>
          <div className="flex flex-wrap gap-2">
            {years.map((entry) => (
              <button
                key={entry.year}
                type="button"
                onClick={() => onSelectYear(entry.year)}
                aria-pressed={entry.year === year}
                className={
                  entry.year === year
                    ? "rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-ink"
                    : "rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/85 hover:bg-white/20"
                }
              >
                {entry.year}
                <span className="ml-1.5 text-xs opacity-60">
                  {entry.memberCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Announcements and reunions for the selected class, shown below the results. */
export function ClassNotices({
  announcements,
  events,
}: {
  announcements: ClassAnnouncement[];
  events: SchoolEvent[];
}) {
  if (announcements.length === 0 && events.length === 0) return null;

  return (
    <div className="mt-16 space-y-16">
      {announcements.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="What's happening"
            title="Class announcements"
          />
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="card border-l-4 border-l-brand p-6"
              >
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <Megaphone className="size-3.5" aria-hidden />
                  Class of {announcement.classYear}
                </div>
                <h3 className="mt-2 font-semibold text-ink">
                  {announcement.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {announcement.body}
                </p>
                <p className="mt-3 text-xs text-ink-soft">
                  {announcement.postedByName} ·{" "}
                  {formatRelative(announcement.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="What's happening"
            title="Reunions & class events"
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
