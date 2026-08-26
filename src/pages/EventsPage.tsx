import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { listEvents } from "@/services/eventService";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/States";
import { cn } from "@/utils/cn";
import { EVENT_TYPE_LABELS, type EventType } from "@/types";
import { isUpcoming } from "@/utils/date";

type Tab = "upcoming" | "past";

export function EventsPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [type, setType] = useState<EventType | "all">("all");
  const events = useAsync(() => listEvents(), []);

  const visible = events.data
    ?.filter((event) =>
      tab === "upcoming" ? isUpcoming(event.date) : !isUpcoming(event.date),
    )
    .filter((event) => type === "all" || event.eventType === type)
    .sort(
      (a, b) => (tab === "upcoming" ? 1 : -1) * a.date.localeCompare(b.date),
    );

  return (
    <div className="section py-12">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          What is happening?
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Events & reunions
        </h1>
        <p className="mt-3 text-ink-soft">
          Reunions, meet-ups, cricket matches and the annual Founder&apos;s Day
          service.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-black/5 p-1" role="tablist">
          {(["upcoming", "past"] as Tab[]).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition",
                tab === value
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <TypeChip active={type === "all"} onClick={() => setType("all")}>
            All
          </TypeChip>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((value) => (
            <TypeChip
              key={value}
              active={type === value}
              onClick={() => setType(value)}
            >
              {EVENT_TYPE_LABELS[value]}
            </TypeChip>
          ))}
        </div>
      </div>

      {events.error ? (
        <ErrorState error={events.error} onRetry={events.reload} />
      ) : events.loading ? (
        <SkeletonGrid count={4} />
      ) : visible && visible.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="size-8" />}
          title={
            tab === "upcoming"
              ? "Nothing scheduled yet"
              : "No past events to show"
          }
          description={
            tab === "upcoming"
              ? "When the committee schedules the next reunion or meet-up, it will appear here."
              : "Past events will be archived here after they take place."
          }
        />
      )}
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition",
        active
          ? "border-brand bg-brand text-white"
          : "border-black/10 text-ink-soft hover:border-brand/40 hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}
