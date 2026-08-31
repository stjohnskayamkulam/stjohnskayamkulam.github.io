import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  GraduationCap,
  HandHeart,
  MapPin,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { getProfile } from "@/services/alumniService";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/buttonStyles";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { canSeeField } from "@/utils/visibility";
import { classOfLabel, isRecordedGradYear } from "@/utils/profile";
import { HELP_OFFER_LABELS, type AlumniProfile } from "@/types";
import {
  formatClassesAttended,
  parseClassesAttended,
} from "@/config/schoolClasses";

export function AlumniProfilePage() {
  const { uid = "" } = useParams();
  const { session, isAdmin, isSuperAdmin } = useAuth();
  const profile = useAsync(() => getProfile(uid), [uid]);

  if (profile.loading) return <LoadingBlock label="Loading profile…" />;
  if (profile.error)
    return <ErrorState error={profile.error} onRetry={profile.reload} />;
  if (!profile.data) {
    return (
      <div className="section py-20">
        <EmptyState
          title="Profile not found"
          description="This member may have left the network or the link may be out of date."
          action={
            <Link to="/alumni" className={buttonClass("outline", "sm", "mt-2")}>
              Back to the directory
            </Link>
          }
        />
      </div>
    );
  }

  const person = profile.data;
  const yearLabel = classOfLabel(person.gradYear);
  const isSelf = session?.account.uid === person.uid;
  const attended = parseClassesAttended(person.yearsAttended);

  /** Shared with the alumni map so a hidden field cannot leak through one screen. */
  const canSee = (field: keyof AlumniProfile["fieldVisibility"]): boolean =>
    canSeeField(person, field, {
      uid: session?.account.uid,
      gradYear: session?.profile?.gradYear,
      isAdmin,
      isSignedIn: Boolean(session),
    });

  const location = [
    canSee("city") ? person.city : null,
    canSee("country") ? person.country : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="pb-16">
      <div className="bg-brand-soft/40 paper-grain">
        <div className="section py-10">
          <Link
            to="/alumni"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Directory
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <Avatar
              name={person.fullName}
              src={person.photoURL}
              size="xl"
              className="ring-4"
            />

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {yearLabel && (
                  <Badge tone="brand">
                    <GraduationCap className="size-3" aria-hidden />
                    {yearLabel}
                  </Badge>
                )}
                {person.batch && <Badge tone="neutral">{person.batch}</Badge>}
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                {person.fullName}
              </h1>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ink-soft">
                {location && (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <MapPin className="size-3.5" aria-hidden />
                    {location}
                  </span>
                )}
                {canSee("profession") && person.profession && (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Briefcase className="size-3.5" aria-hidden />
                    {person.profession}
                  </span>
                )}
                {canSee("company") && person.company && (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Building2 className="size-3.5" aria-hidden />
                    {person.company}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isSelf && (
                <Link to="/profile" className={buttonClass("primary", "sm")}>
                  Edit my profile
                </Link>
              )}
              {isSuperAdmin && !isSelf && (
                <Link
                  to={`/alumni/${person.uid}/edit`}
                  className={buttonClass("primary", "sm")}
                >
                  Edit profile
                </Link>
              )}
              {canSee("linkedinUrl") && person.linkedinUrl && (
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClass("outline", "sm")}
                >
                  LinkedIn
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="section grid gap-8 py-12 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {canSee("bio") && person.bio && (
            <Panel title="About">
              <p className="leading-relaxed text-ink/85">{person.bio}</p>
            </Panel>
          )}

          {person.sinceSchool && (
            <Panel title="What I've been doing since school">
              <p className="leading-relaxed text-ink/85">
                {person.sinceSchool}
              </p>
            </Panel>
          )}

          {person.helpOffers.length > 0 && (
            <Panel title="How I can help">
              <div className="flex flex-wrap gap-2">
                {person.helpOffers.map((offer) => (
                  <Badge key={offer} tone="success">
                    <HandHeart className="size-3" aria-hidden />
                    {HELP_OFFER_LABELS[offer]}
                  </Badge>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-8">
          <Panel title="At school">
            <dl className="space-y-3 text-sm">
              {attended && (
                <Row
                  label="Attended"
                  value={formatClassesAttended(attended)}
                />
              )}
              {isRecordedGradYear(person.gradYear) && (
                <Row label="Graduated" value={String(person.gradYear)} />
              )}
              {person.batch && <Row label="Batch" value={person.batch} />}
              {person.clubs.length > 0 && (
                <Row label="Clubs" value={person.clubs.join(", ")} />
              )}
              {person.activities.length > 0 && (
                <Row label="Activities" value={person.activities.join(", ")} />
              )}
            </dl>
            {yearLabel && (
              <Link
                to={`/alumni?year=${person.gradYear}`}
                className={buttonClass("outline", "sm", "mt-5 w-full")}
              >
                See the {yearLabel}
              </Link>
            )}
          </Panel>

          {person.interests.length > 0 && (
            <Panel title="Interests">
              <div className="flex flex-wrap gap-2">
                {person.interests.map((interest) => (
                  <Badge key={interest}>{interest}</Badge>
                ))}
              </div>
            </Panel>
          )}

          {canSee("email") && person.email && (
            <Panel title="Contact">
              <a
                href={`mailto:${person.email}`}
                className="text-sm text-brand hover:underline"
              >
                {person.email}
              </a>
              <p className="mt-2 text-xs text-ink-soft">
                Shared because this member chose to make it visible to you.
              </p>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
