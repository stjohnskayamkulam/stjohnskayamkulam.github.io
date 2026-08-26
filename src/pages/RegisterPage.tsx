import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { school } from "@/config/school";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { REQUIRED_APPROVALS } from "@/types";
import { authErrorMessage } from "@/utils/authErrors";

export function RegisterPage() {
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/profile" replace />;

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section flex justify-center py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <img
            src={school.schoolLogo}
            alt=""
            className="mx-auto size-14 rounded-2xl"
          />
          <h1 className="mt-5 font-display text-3xl font-semibold">
            Join the alumni network
          </h1>
          <p className="mt-2 text-ink-soft">
            Sign in with Google. One profile is all it takes for an old
            classmate to find you.
          </p>
        </div>

        <div className="card space-y-5 p-7">
          <Button
            className="w-full"
            loading={busy}
            onClick={() => void handleGoogle()}
          >
            Continue with Google
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 rounded-xl bg-brand-soft/50 p-4 text-sm text-ink-soft">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-brand"
              aria-hidden
            />
            <p>
              New members stay pending until {REQUIRED_APPROVALS} existing
              alumni vouch for them. Complete your profile with your batch so
              people from your year can recognise you.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
