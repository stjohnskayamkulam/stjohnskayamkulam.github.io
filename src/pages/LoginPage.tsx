import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { dataBackend } from "@/config/env";
import { school } from "@/config/school";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export function LoginPage() {
  const { signInWithEmail, signInWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/alumni";

  if (isAuthenticated) return <Navigate to={from} replace />;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.",
      );
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
            Sign in to find your people again.
          </p>
        </div>

        <div className="card space-y-5 p-7">
          <Button
            variant="outline"
            className="w-full"
            loading={busy}
            onClick={() => run(signInWithGoogle)}
          >
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="h-px flex-1 bg-black/10" />
            or use your email
            <span className="h-px flex-1 bg-black/10" />
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void run(() =>
                signInWithEmail(
                  String(form.get("email")),
                  String(form.get("password")),
                ),
              );
            }}
          >
            <TextField
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
            />
            <TextField
              name="password"
              type="password"
              label="Password"
              required
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={busy}>
              Sign in
            </Button>
          </form>

          {dataBackend === "mock" && (
            <p className="rounded-xl bg-accent-soft/40 p-3 text-xs text-ink-soft">
              Demo mode: no Firebase project is configured, so any password
              works. Try{" "}
              <code className="font-medium">maria.thomas@example.com</code> for
              an administrator account, or{" "}
              <code className="font-medium">karthik.reddy@example.com</code> for
              an ordinary member.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Not registered yet?{" "}
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
