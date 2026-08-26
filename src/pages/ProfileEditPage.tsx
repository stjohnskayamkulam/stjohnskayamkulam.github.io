import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { profileCompletion } from "@/services/alumniService";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { buttonClass } from "@/components/ui/buttonStyles";
import { LoadingBlock } from "@/components/ui/States";
import { HELP_OFFER_LABELS, type HelpOffer } from "@/types";
import {
  parseSchoolClass,
  SCHOOL_CLASSES,
  orderClasses,
} from "@/config/schoolClasses";
import { geocodePlace } from "@/data/geocode";
import { resolveLocation } from "@/data/geo";
import { cn } from "@/utils/cn";

/** Comma-separated inputs are friendlier here than a tag widget. */
const splitList = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

async function resolveProfileGeo(
  city: string | undefined,
  country: string | undefined,
): Promise<{ lat: number; lon: number } | null> {
  if (!city) return null;
  const known = resolveLocation(city, country);
  if (known?.precision === "city") {
    return { lat: known.coords[0], lon: known.coords[1] };
  }
  const found = await geocodePlace(city, country);
  return found ? { lat: found[0], lon: found[1] } : null;
}

export function ProfileEditPage() {
  const { session, loading, saveProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOffers, setHelpOffers] = useState<HelpOffer[]>(
    session?.profile?.helpOffers ?? [],
  );

  if (loading) return <LoadingBlock />;
  if (!session?.profile) {
    return (
      <div className="section py-20 text-center">
        <p className="text-ink-soft">
          We could not load your profile. Try signing in again.
        </p>
      </div>
    );
  }

  const profile = session.profile;
  const completion = profileCompletion(profile);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveProfile({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        gradYear: Number(form.get("gradYear")),
        batch: String(form.get("batch") || "") || undefined,
        yearsAttended: (() => {
          const from = parseSchoolClass(form.get("attendedFrom"));
          const to = parseSchoolClass(form.get("attendedTo")) ?? from;
          return from && to ? orderClasses(from, to) : undefined;
        })(),
        photoURL: String(form.get("photoURL") || "") || null,
        city: String(form.get("city") || "") || undefined,
        country: String(form.get("country") || "") || undefined,
        geo: await resolveProfileGeo(
          String(form.get("city") || "") || undefined,
          String(form.get("country") || "") || undefined,
        ),
        profession: String(form.get("profession") || "") || undefined,
        industry: String(form.get("industry") || "") || undefined,
        company: String(form.get("company") || "") || undefined,
        linkedinUrl: String(form.get("linkedinUrl") || "") || undefined,
        bio: String(form.get("bio") || "") || undefined,
        sinceSchool: String(form.get("sinceSchool") || "") || undefined,
        interests: splitList(form.get("interests")),
        activities: splitList(form.get("activities")),
        clubs: splitList(form.get("clubs")),
        helpOffers,
        visibility: form.get("visibility") as "alumni" | "class" | "private",
      });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="section max-w-4xl py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.fullName} src={profile.photoURL} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">My profile</h1>
            <p className="text-sm text-ink-soft">Class of {profile.gradYear}</p>
          </div>
        </div>
        <Link
          to={`/alumni/${profile.uid}`}
          className={buttonClass("outline", "sm")}
        >
          <Eye className="size-4" aria-hidden />
          View as others see it
        </Link>
      </header>

      {/* Completion nudge — an incomplete directory is a useless directory. */}
      <div className="card mb-8 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile completeness</span>
          <span className="text-ink-soft">{completion}%</span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
        {completion < 100 && (
          <p className="mt-2.5 text-xs text-ink-soft">
            Profiles with a photo, a city and a line about what you do are far
            more likely to be recognised by an old classmate.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Section title="The basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="firstName"
              label="First name"
              required
              defaultValue={profile.firstName}
            />
            <TextField
              name="lastName"
              label="Last name"
              required
              defaultValue={profile.lastName}
            />
            <TextField
              name="gradYear"
              label="Graduation year"
              type="number"
              required
              defaultValue={profile.gradYear}
            />
            <TextField
              name="batch"
              label="Class / batch"
              defaultValue={profile.batch ?? ""}
            />
            <SelectField
              name="attendedFrom"
              label="Attended from"
              defaultValue={profile.yearsAttended?.from ?? ""}
              hint="LKG, UKG, then classes 1 to 12."
            >
              <option value="">Select class</option>
              {SCHOOL_CLASSES.map((schoolClass) => (
                <option key={schoolClass} value={schoolClass}>
                  {schoolClass}
                </option>
              ))}
            </SelectField>
            <SelectField
              name="attendedTo"
              label="Attended until"
              defaultValue={profile.yearsAttended?.to ?? ""}
            >
              <option value="">Select class</option>
              {SCHOOL_CLASSES.map((schoolClass) => (
                <option key={schoolClass} value={schoolClass}>
                  {schoolClass}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            name="photoURL"
            label="Photo URL"
            type="url"
            defaultValue={profile.photoURL ?? ""}
            hint="A recognisable face helps more than a logo."
          />
        </Section>

        <Section title="Where life took you">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="city"
              label="Current city"
              defaultValue={profile.city ?? ""}
            />
            <TextField
              name="country"
              label="Country"
              defaultValue={profile.country ?? ""}
            />
            <TextField
              name="profession"
              label="Profession"
              defaultValue={profile.profession ?? ""}
            />
            <TextField
              name="industry"
              label="Industry"
              defaultValue={profile.industry ?? ""}
            />
            <TextField
              name="company"
              label="Company"
              defaultValue={profile.company ?? ""}
            />
            <TextField
              name="linkedinUrl"
              label="LinkedIn"
              type="url"
              defaultValue={profile.linkedinUrl ?? ""}
            />
          </div>
        </Section>

        <Section title="Your story">
          <TextAreaField
            name="bio"
            label="Short biography"
            defaultValue={profile.bio ?? ""}
          />
          <TextAreaField
            name="sinceSchool"
            label="What I've been doing since school"
            defaultValue={profile.sinceSchool ?? ""}
            placeholder="The short version — where you went, what you do, what you would still like to do."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              name="interests"
              label="Interests"
              defaultValue={profile.interests.join(", ")}
              hint="Comma separated"
            />
            <TextField
              name="activities"
              label="School activities"
              defaultValue={profile.activities.join(", ")}
              hint="Comma separated"
            />
            <TextField
              name="clubs"
              label="Clubs & sports"
              defaultValue={profile.clubs.join(", ")}
              hint="Comma separated"
            />
          </div>
        </Section>

        <Section title="How I can help">
          <p className="text-sm text-ink-soft">
            Optional, but this is what turns a directory into a network.
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(HELP_OFFER_LABELS) as HelpOffer[]).map((offer) => {
              const active = helpOffers.includes(offer);
              return (
                <button
                  key={offer}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setHelpOffers((current) =>
                      active
                        ? current.filter((o) => o !== offer)
                        : [...current, offer],
                    )
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition",
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-black/10 text-ink-soft hover:border-brand/40",
                  )}
                >
                  {HELP_OFFER_LABELS[offer]}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Who can see this profile">
          <SelectField
            name="visibility"
            defaultValue={profile.visibility}
            label="Profile visibility"
          >
            <option value="alumni">All verified alumni</option>
            <option value="class">Only my graduating class</option>
            <option value="private">Private — administrators only</option>
          </SelectField>
          <p className="text-sm text-ink-soft">
            Field-by-field controls, including your email and phone number, live
            in{" "}
            <Link
              to="/settings"
              className="font-medium text-brand hover:underline"
            >
              Settings
            </Link>
            .
          </p>
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving} size="lg">
            Save profile
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-4 p-6">
      <h2 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
