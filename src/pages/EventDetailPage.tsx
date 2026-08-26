import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import {
  cancelRsvp,
  getEvent,
  listAttendees,
  rsvp,
} from "@/services/eventService";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/buttonStyles";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { EVENT_TYPE_LABELS } from "@/types";
import { formatEventDate, formatTime, isUpcoming } from "@/utils/date";

export function EventDetailPage() {
  const { id = "" } = useParams();
  const { session, isVerified } = useAuth();

  const event = useAsync(() => getEvent(id), [id]);
  const attendees = useAsync(() => listAttendees(id), [id]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = session?.account.uid;
  // Derived from the attendee list rather than mirrored into state, so a reload
  // after RSVP is the single source of truth.
  const attending = Boolean(uid && attendees.data?.some((a) => a.uid === uid));

  if (event.loading) return <LoadingBlock label="Loading event…" />;
  if (event.error)
    return <ErrorState error={event.error} onRetry={event.reload} />;
  if (!event.data) {
    return (
      <div className="section py-20">
        <EmptyState
          title="Event not found"
          description="It may have been removed by the organiser."
          action={
            <Link to="/events" className={buttonClass("outline", "sm", "mt-2")}>
              All events
            </Link>
          }
        />
      </div>
    );
  }

  const data = event.data;
  const upcoming = isUpcoming(data.date);
  const full =
    data.capacity != null && data.attendeeCount >= data.capacity && !attending;

  async function toggleRsvp() {
    if (!session?.profile || !uid) return;
    setBusy(true);
    setError(null);
    try {
      if (attending) {
        await cancelRsvp(id, uid);
      } else {
        await rsvp(id, {
          uid,
          displayName: session.profile.fullName,
          gradYear: session.profile.gradYear,
          photoURL: session.profile.photoURL,
          rsvpAt: new Date().toISOString(),
        });
      }
      // Refetch rather than guess: capacity and counts are server-owned.
      event.reload();
      attendees.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update your RSVP.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-16">
      {data.imageUrl && (
        <div className="relative h-56 w-full overflow-hidden bg-brand-dark sm:h-80">
          <img
            src={data.imageUrl}
            alt=""
            aria-hidden
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 to-transparent" />
        </div>
      )}

      <div className="section grid gap-10 py-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Link
            to="/events"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All events
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{EVENT_TYPE_LABELS[data.eventType]}</Badge>
            {data.classYear && (
              <Link to={`/alumni?year=${data.classYear}`}>
                <Badge tone="accent">Class of {data.classYear}</Badge>
              </Link>
            )}
            {!upcoming && <Badge tone="neutral">Past event</Badge>}
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
            {data.title}
          </h1>

          <p className="mt-6 leading-relaxed whitespace-pre-line text-ink/85">
            {data.description}
          </p>

          <section className="mt-10">
            <h2 className="mb-4 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Who is coming
            </h2>
            {attendees.data && attendees.data.length > 0 ? (
              <ul className="flex flex-wrap gap-4">
                {attendees.data.map((attendee) => (
                  <li key={attendee.uid}>
                    <Link
                      to={`/alumni/${attendee.uid}`}
                      className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 shadow-sm hover:shadow"
                    >
                      <Avatar
                        name={attendee.displayName}
                        src={attendee.photoURL}
                        size="sm"
                      />
                      <span className="text-sm">
                        {attendee.displayName}
                        <span className="ml-1.5 text-xs text-ink-soft">
                          &apos;{String(attendee.gradYear).slice(-2)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">
                {data.attendeeCount > 0
                  ? `${data.attendeeCount} alumni have RSVP'd. Be the first from your class to say hello.`
                  : "No RSVPs yet — yours would be the first."}
              </p>
            )}
          </section>
        </div>

        <aside>
          <div className="card sticky top-24 space-y-5 p-6">
            <dl className="space-y-4 text-sm">
              <Detail icon={CalendarDays} label="Date">
                {formatEventDate(data.date)}
              </Detail>
              <Detail icon={Clock} label="Time">
                {formatTime(data.startTime)}
                {data.endTime && ` – ${formatTime(data.endTime)}`}
              </Detail>
              <Detail icon={MapPin} label="Location">
                {data.location}
              </Detail>
              <Detail icon={Users} label="Attending">
                {data.attendeeCount} alumni
                {data.capacity != null && ` of ${data.capacity} places`}
              </Detail>
            </dl>

            <div className="border-t border-black/5 pt-5">
              {!session ? (
                <>
                  <p className="mb-3 text-sm text-ink-soft">
                    Sign in to RSVP for this event.
                  </p>
                  <Link
                    to="/login"
                    className={buttonClass("primary", "md", "w-full")}
                  >
                    Sign in
                  </Link>
                </>
              ) : !isVerified ? (
                <p className="text-sm text-ink-soft">
                  RSVPs open once your membership has been verified.
                </p>
              ) : !upcoming ? (
                <p className="text-sm text-ink-soft">
                  This event has already taken place.
                </p>
              ) : (
                <>
                  <Button
                    onClick={toggleRsvp}
                    loading={busy}
                    disabled={full}
                    variant={attending ? "outline" : "primary"}
                    className="w-full"
                  >
                    {attending ? (
                      <>
                        <UserCheck className="size-4" aria-hidden />
                        You&apos;re attending — cancel?
                      </>
                    ) : full ? (
                      "Event is full"
                    ) : (
                      "I'm attending"
                    )}
                  </Button>
                  {error && (
                    <p className="mt-2 text-xs text-red-600">{error}</p>
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-ink-soft">
              Organised by {data.organizer}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <div>
        <dt className="text-xs tracking-wide text-ink-soft uppercase">
          {label}
        </dt>
        <dd className="mt-0.5 font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}
