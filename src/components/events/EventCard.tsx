import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EVENT_TYPE_LABELS, type SchoolEvent } from "@/types";
import { classOfLabel, isRecordedGradYear } from "@/utils/profile";
import {
  formatEventDate,
  formatTime,
  isUpcoming,
  parseDate,
} from "@/utils/date";

export function EventCard({ event }: { event: SchoolEvent }) {
  const date = parseDate(event.date);
  const past = !isUpcoming(event.date);

  return (
    <Link
      to={`/events/${event.id}`}
      className="card group flex gap-5 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Tear-off calendar block, a little more evocative than a date string. */}
      <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand text-white">
        <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">
          {date.toLocaleString("en-US", { month: "short" })}
        </span>
        <span className="font-display text-2xl leading-none font-semibold">
          {date.getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={past ? "neutral" : "brand"}>
            {EVENT_TYPE_LABELS[event.eventType]}
          </Badge>
          {isRecordedGradYear(event.classYear) && (
            <Badge tone="accent">{classOfLabel(event.classYear)}</Badge>
          )}
          {past && <Badge tone="neutral">Past</Badge>}
        </div>

        <h3 className="mt-2.5 font-semibold text-ink group-hover:text-brand">
          {event.title}
        </h3>

        <dl className="mt-2 space-y-1 text-sm text-ink-soft">
          <div className="flex items-center gap-2">
            <dt className="sr-only">When</dt>
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <dd>
              {formatEventDate(event.date)} · {formatTime(event.startTime)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Where</dt>
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <dd className="truncate">{event.location}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Attending</dt>
            <Users className="size-3.5 shrink-0" aria-hidden />
            <dd>
              {event.attendeeCount} alumni {past ? "attended" : "attending"}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
