import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { school } from "@/config/school";
import { useAuth } from "@/hooks/useAuth";
import { useAsync } from "@/hooks/useAsync";
import { getCommunityStats } from "@/services/alumniService";
import { listEvents } from "@/services/eventService";
import { EventCard } from "@/components/events/EventCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonClass } from "@/components/ui/buttonStyles";

export function HomePage() {
  const { isAuthenticated } = useAuth();

  const stats = useAsync(() => getCommunityStats(), []);
  const events = useAsync(
    () => listEvents({ upcomingOnly: true, limit: 3 }),
    [],
  );

  return (
    <>
      {/* Hero -------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        {/* The backdrop colour carries the hero on its own, so a hero image that
            fails to load costs some warmth but never a broken layout. */}
        <div className="absolute inset-0 bg-brand-dark">
          <img
            src={school.heroImageUrl}
            alt=""
            aria-hidden
            className="size-full object-cover"
            fetchPriority="high"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/85 via-brand-dark/70 to-brand-dark/90" />
        </div>

        <div className="section relative py-24 text-center sm:py-32">
          <p className="text-xs font-semibold tracking-[0.28em] text-accent uppercase">
            Est. {school.foundedYear} · {school.location}
          </p>

          <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl leading-[1.08] font-semibold text-white sm:text-6xl">
            {school.schoolName} Alumni Network
          </h1>

          <p className="mt-5 font-display text-xl text-accent italic sm:text-2xl">
            {school.tagline}
          </p>

          <p className="mx-auto mt-6 max-w-xl text-white/80">
            The alumni network of St. John&apos;s School, Peringala P.O.,
            Kayamkulam. Find the people you sat next to, the ones who moved
            away, and the ones who never left.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/alumni" className={buttonClass("secondary", "lg")}>
              <Search className="size-4" aria-hidden />
              Find alumni
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className={buttonClass(
                  "outline",
                  "lg",
                  "border-white/40 text-white hover:bg-white/10",
                )}
              >
                Join the network
              </Link>
            )}
          </div>

          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            <Stat label="Alumni members" value={stats.data?.alumniCount} />
            <Stat label="Graduating classes" value={stats.data?.classCount} />
            <Stat label="Countries" value={stats.data?.countryCount} />
            <Stat
              label="Upcoming events"
              value={stats.data?.upcomingEventCount}
            />
          </dl>
        </div>
      </section>

      {/* Upcoming events --------------------------------------------------- */}
      <section className="section py-16 sm:py-20">
        <SectionHeading
          eyebrow="What's happening"
          title="Upcoming events"
          description="Reunions, meet-ups and the annual cricket match nobody has won in four years."
          action={
            <Link to="/events" className={buttonClass("outline", "sm")}>
              All events
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {events.data?.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* Closing CTA -------------------------------------------------------- */}
      <section className="section pb-20">
        <div className="card paper-grain overflow-hidden bg-brand px-8 py-16 text-center text-white sm:px-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight font-semibold sm:text-4xl">
            Your school years ended. Your community didn&apos;t.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/75">
            Every profile added makes it easier for someone else to find the
            person they have been meaning to look up for twenty years.
          </p>
          <Link
            to={isAuthenticated ? "/alumni" : "/register"}
            className={buttonClass("secondary", "lg", "mt-9")}
          >
            {isAuthenticated
              ? "Find your classmates"
              : "Join the alumni network"}
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    // Reversed so the figure reads above its label while keeping `dt` first in
    // the markup, which the HTML spec requires.
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-xs tracking-wide text-white/60 uppercase">
        {label}
      </dt>
      <dd className="font-display text-4xl font-semibold text-white">
        {value == null ? <span className="opacity-40">—</span> : value}
      </dd>
    </div>
  );
}
