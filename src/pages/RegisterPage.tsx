import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { school } from "@/config/school";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

const THIS_YEAR = new Date().getFullYear();

export function RegisterPage() {
  const { register, signInWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/profile" replace />;

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        gradYear: Number(form.get("gradYear")),
        batch: String(form.get("batch") || "") || undefined,
      });
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
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
            One profile is all it takes for an old classmate to find you.
          </p>
        </div>

        <div className="card space-y-5 p-7">
          <Button
            variant="outline"
            className="w-full"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await signInWithGoogle();
                navigate("/profile", { replace: true });
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Sign-up failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="h-px flex-1 bg-black/10" />
            or register with email
            <span className="h-px flex-1 bg-black/10" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="firstName"
                label="First name"
                required
                autoComplete="given-name"
              />
              <TextField
                name="lastName"
                label="Last name"
                required
                autoComplete="family-name"
              />
              <TextField
                name="gradYear"
                label="Graduation year"
                type="number"
                required
                min={school.foundedYear}
                max={THIS_YEAR}
                placeholder="2002"
              />
              <TextField
                name="batch"
                label="Class / batch"
                placeholder="12-A (optional)"
              />
            </div>

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
              minLength={8}
              autoComplete="new-password"
              hint="At least 8 characters."
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" loading={busy}>
              Create my account
            </Button>
          </form>

          <div className="flex gap-3 rounded-xl bg-brand-soft/50 p-4 text-sm text-ink-soft">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-brand"
              aria-hidden
            />
            <p>
              New members are verified by a volunteer from the alumni committee
              before the directory opens up. This keeps the network to actual
              alumni, which is the whole point.
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
