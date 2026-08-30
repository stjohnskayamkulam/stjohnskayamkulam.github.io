import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  parseRequiredProfileFields,
  REQUIRED_PROFILE_MESSAGE,
} from "@/services/alumniService";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { SCHOOL_CLASSES } from "@/config/schoolClasses";
import { school } from "@/config/school";
import { resolveProfileGeo } from "@/data/profileGeo";

/**
 * Blocks the rest of the site until the fields classmates need to recognise
 * someone are filled. Optional bio, photo and work details stay on /profile.
 */
export function RequiredProfileModal() {
  const { session, saveProfile, signOut } = useAuth();
  const profile = session?.profile;
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const required = parseRequiredProfileFields(
        new FormData(formEvent.currentTarget),
      );
      await saveProfile({
        ...required,
        geo: await resolveProfileGeo(required.city, required.country),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : REQUIRED_PROFILE_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="required-profile-title"
    >
      <div className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-7">
            <h2
              id="required-profile-title"
              className="font-display text-2xl font-semibold"
            >
              Complete your required details
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Name, 10th-standard year, classes attended, city and country are
              needed so classmates can find you. Photo, work and the rest of
              your story can wait until you open your profile.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <TextField
                name="firstName"
                label="First name"
                required
                autoComplete="given-name"
                autoFocus
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
                label="10th Grade Graduation Year"
                type="number"
                required
                min={school.foundedYear}
                max={new Date().getFullYear() + 1}
                defaultValue={profile.gradYear || ""}
                hint={`Please enter the year you graduated from 10th standard, regardless of when you joined or left ${school.schoolName}. Do not enter your Class 12 graduation year.`}
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
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-black/5 bg-paper px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <Button type="submit" loading={saving} className="w-full sm:w-auto">
              Continue
            </Button>
            <Button
              type="button"
              variant="ghost"
              loading={signingOut}
              className="w-full sm:w-auto"
              onClick={() => {
                setSigningOut(true);
                void signOut().finally(() => setSigningOut(false));
              }}
            >
              Sign out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
