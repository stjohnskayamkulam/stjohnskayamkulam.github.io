import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { LoadingBlock } from "@/components/ui/States";
import {
  DEFAULT_FIELD_VISIBILITY,
  type FieldVisibility,
  type Visibility,
} from "@/types";

const FIELD_LABELS: Record<keyof FieldVisibility, string> = {
  email: "Email address",
  phone: "Phone number",
  city: "Current city",
  country: "Country",
  profession: "Profession",
  company: "Company",
  linkedinUrl: "LinkedIn profile",
  bio: "Biography",
};

const SCOPES: { value: Visibility; label: string }[] = [
  { value: "alumni", label: "All verified alumni" },
  { value: "class", label: "Only my class" },
  { value: "private", label: "Private" },
];

export function SettingsPage() {
  const { session, loading, saveProfile, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [visibility, setVisibility] = useState<FieldVisibility>(
    session?.profile?.fieldVisibility ?? DEFAULT_FIELD_VISIBILITY,
  );

  if (loading) return <LoadingBlock />;
  if (!session) return null;

  const profile = session.profile;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveProfile({ fieldVisibility: visibility });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="section max-w-3xl py-12">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-ink-soft">
        You decide what the rest of the network can see. Contact details stay
        private by default.
      </p>

      <section className="card mt-8 p-6">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
          Account
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            value={session.account.email}
            readOnly
            disabled
          />
          <TextField
            label="Membership status"
            value={
              session.account.status === "verified"
                ? "Verified member"
                : session.account.status === "pending"
                  ? "Awaiting verification"
                  : "Not verified"
            }
            readOnly
            disabled
          />
        </div>
      </section>

      {profile && (
        <section className="card mt-6 p-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                Field privacy
              </h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                Contact details are never included in directory search results,
                whatever you choose here.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(Object.keys(FIELD_LABELS) as (keyof FieldVisibility)[]).map(
              (field) => (
                <SelectField
                  key={field}
                  label={FIELD_LABELS[field]}
                  value={visibility[field]}
                  onChange={(e) =>
                    setVisibility((current) => ({
                      ...current,
                      [field]: e.target.value as Visibility,
                    }))
                  }
                >
                  {SCOPES.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </SelectField>
              ),
            )}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button onClick={handleSave} loading={saving}>
              Save privacy settings
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden />
                Saved
              </span>
            )}
          </div>
        </section>
      )}

      <section className="card mt-6 p-6">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
          Session
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Signing out will not remove your profile from the directory.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}
