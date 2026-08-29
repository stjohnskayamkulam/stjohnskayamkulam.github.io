import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { school } from "@/config/school";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { authErrorMessage } from "@/utils/authErrors";

export function LoginPage() {
  const { signInWithGoogle, isAuthenticated, isVerified } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/alumni";

  if (isAuthenticated) {
    return <Navigate to={isVerified ? from : "/"} replace />;
  }

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
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src={school.schoolLogo}
            alt=""
            className="mx-auto size-14 rounded-2xl"
          />
          <h1 className="mt-5 font-display text-3xl font-semibold">
            Welcome back
          </h1>
          <p className="mt-2 text-ink-soft">
            Sign in with Google to find your people again.
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
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          First time here?{" "}
          <Link
            to="/register"
            className="font-medium text-brand hover:underline"
          >
            Join the alumni network
          </Link>
        </p>
      </div>
    </div>
  );
}
