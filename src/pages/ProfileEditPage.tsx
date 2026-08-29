import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Eye } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import {
  getProfile,
  profileCompletion,
  updateProfile,
} from "@/services/alumniService";
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
import { school } from "@/config/school";
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
  const { uid: routeUid } = useParams();
  const { session, loading, saveProfile } = useAuth();
  const editingOther = Boolean(routeUid && routeUid !== session?.account.uid);
  const loaded = useAsync(
    () => (routeUid ? getProfile(routeUid) : Promise.resolve(null)),
    [routeUid],
  );

  const profile = routeUid ? loaded.data : session?.profile;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerEdits, setOfferEdits] = useState<{
    uid: string;
    offers: HelpOffer[];
  } | null>(null);
  const helpOffers =
    profile && offerEdits?.uid === profile.uid
      ? offerEdits.offers
      : (profile?.helpOffers ?? []);

  if (loading || (routeUid && loaded.loading)) return <LoadingBlock />;
  if (routeUid && loaded.error) {
    return (
      <div className="section py-20 text-center">
        <p className="text-ink-soft">
          {loaded.error instanceof Error
            ? loaded.error.message
            : "We could not load that profile."}
        </p>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="section py-20 text-center">
        <p className="text-ink-soft">
          {routeUid
            ? "This member does not have a profile yet."
            : "We could not load your profile. Try signing in again."}
        </p>
      </div>
    );
  }

  const completion = profileCompletion(profile);
  const profileUid = profile.uid;

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const firstName = String(form.get("firstName") ?? "").trim();
      const lastName = String(form.get("lastName") ?? "").trim();
      const gradYear = Number(form.get("gradYear"));
      const attendedFrom = parseSchoolClass(form.get("attendedFrom"));
      const attendedTo = parseSchoolClass(form.get("attendedTo"));
      const city = String(form.get("city") ?? "").trim();
      const country = String(form.get("country") ?? "").trim();

      if (
        !firstName ||
        !lastName ||
        !Number.isInteger(gradYear) ||
        gradYear < 1900 ||
        !attendedFrom ||
        !attendedTo ||
        !city ||
        !country
      ) {
        throw new Error(
          "Name, graduation year, classes attended, city and country are required.",
        );
      }

      const patch = {
        firstName,
        lastName,
        gradYear,
        batch: String(form.get("batch") || "") || undefined,
        yearsAttended: orderClasses(attendedFrom, attendedTo),
        photoURL: String(form.get("photoURL") || "") || null,
        city,
        country,
        geo: await resolveProfileGeo(city, country),
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
      };

      if (editingOther) {
        await updateProfile(profileUid, patch);
      } else {
        await saveProfile(patch);
      }
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingOther
            ? "Could not save this profile."
            : "Could not save your profile.",
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
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {editingOther ? "Edit profile" : "My profile"}
            </h1>
            <p className="text-sm text-ink-soft">
              {editingOther
                ? `${profile.fullName} · Class of ${profile.gradYear}`
                : `Class of ${profile.gradYear}`}
            </p>
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

      {editingOther && (
        <p className="mb-6 text-sm text-ink-soft">
          You are editing this record as the network administrator. Membership
          status is unchanged by this form.
        </p>
      )}

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
        <p className="text-sm text-ink-soft">
          Fields marked <span className="text-red-600">*</span> are required.
        </p>
        <Section title="The basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="firstName"
              label="First name"
              required
              autoComplete="given-name"
              defaultValue={profile.firstName}
            />
            <TextField
              name="lastName"
              label="Last name"
              required
              autoComplete="family-name"
              defaultValue={profile.lastName}
            />
            <TextField
              name="gradYear"
              label="Graduation year"
              type="number"
              required
              min={school.foundedYear}
              max={new Date().getFullYear() + 1}
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
              required
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
              required
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
              required
              autoComplete="address-level2"
              defaultValue={profile.city ?? ""}
            />
            <TextField
              name="country"
              label="Country"
              required
              autoComplete="country-name"
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
                  onClick={() => {
                    if (!profile) return;
                    setOfferEdits({
                      uid: profile.uid,
                      offers: active
                        ? helpOffers.filter((o) => o !== offer)
                        : [...helpOffers, offer],
                    });
                  }}
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
          {editingOther ? (
            <p className="text-sm text-ink-soft">
              Field-by-field privacy, including email and phone, stays in their
              own Settings page.
            </p>
          ) : (
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
          )}
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
