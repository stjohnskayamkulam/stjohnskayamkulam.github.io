import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { ConsentCheckbox } from "@/components/auth/ConsentCheckbox";
import { school } from "@/config/school";

/**
 * One-time gate for accounts created before the notice, and for anyone who
 * signed in without ticking Join. The rest of the site stays inert until they
 * agree or sign out.
 */
export function ConsentModal() {
  const { recordConsent, signOut } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAgree() {
    if (!agreed) return;
    setSaving(true);
    setError(null);
    try {
      await recordConsent();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your agreement. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-7">
          <h2
            id="consent-title"
            className="font-display text-2xl font-semibold"
          >
            Before you continue
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            This network is for adults. Volunteer alumni of {school.schoolName}{" "}
            keep the name, class, city and other details you add so classmates
            can find you. Contact details stay private unless you change that.
            You can delete the account later from Settings.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            <Link to="/privacy" className="font-medium text-brand hover:underline">
              Read the full privacy notice
            </Link>
          </p>
          <div className="mt-6">
            <ConsentCheckbox checked={agreed} onChange={setAgreed} />
          </div>
          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-black/5 bg-paper px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <Button
            type="button"
            loading={saving}
            disabled={!agreed}
            className="w-full sm:w-auto"
            onClick={() => void handleAgree()}
          >
            Agree and continue
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
      </div>
    </div>
  );
}
