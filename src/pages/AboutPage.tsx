import { Link } from "react-router-dom";
import { HandHeart, Images, Search, ShieldCheck } from "lucide-react";
import { school } from "@/config/school";
import { buttonClass } from "@/components/ui/buttonStyles";

export function AboutPage() {
  return (
    <div className="pb-16">
      <header className="bg-brand-soft/40 paper-grain">
        <div className="section max-w-3xl py-16 text-center">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            Find your people again
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            This is the alumni network of {school.schoolName}, {school.location}{" "}
            — built and run by former students, for former students. It is not a
            professional network and it is not a social media feed. It exists so
            that the people you spent your school years with are findable again.
          </p>
        </div>
      </header>

      <div className="section max-w-3xl space-y-14 py-14">
        <section>
          <h2 className="text-2xl font-semibold">What you can do here</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Point icon={Search} title="Who do I know?">
              Search the directory by year, city or profession, and see everyone
              from your own graduating class in one place.
            </Point>
            <Point icon={Images} title="What is happening?">
              Reunions, meet-ups, class announcements and news of what people
              have been doing since they left.
            </Point>
            <Point icon={HandHeart} title="How can I help?">
              Turn up to a reunion, help organise one, and keep your own entry
              current so the people looking for you can find you.
            </Point>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Who can join</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Anyone who attended {school.schoolName}. Sign-in is Google only, and
            every new member needs two existing alumni to vouch for them before
            the directory unlocks. That step is deliberate: people share where
            they live and what they do here, and it should only be visible to
            people who actually went to the school.
          </p>
        </section>

        <section className="card flex gap-4 p-6">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-brand"
            aria-hidden
          />
          <div>
            <h2 className="font-semibold">Your information, your choice</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Email addresses and phone numbers are private by default and never
              appear in search results. Every other field can be limited to your
              own class or hidden entirely, and you can change all of it at any
              time from your settings.
            </p>
            <Link
              to="/settings"
              className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
            >
              Review your privacy settings →
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Run by volunteers</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            The committee maintains this in its spare time. If something is
            wrong, if you spot a profile that should not be here, or if you
            would like to help run it, write to{" "}
            <a
              href={`mailto:${school.contactEmail}`}
              className="font-medium text-brand hover:underline"
            >
              {school.contactEmail}
            </a>
            .
          </p>
        </section>

        <div className="text-center">
          <Link to="/register" className={buttonClass("primary", "lg")}>
            Join the alumni network
          </Link>
        </div>
      </div>
    </div>
  );
}

function Point({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Search;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <Icon className="size-5 text-brand" aria-hidden />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}
