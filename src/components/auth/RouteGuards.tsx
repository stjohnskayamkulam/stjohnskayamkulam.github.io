import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingBlock } from "@/components/ui/States";
import { buttonClass } from "@/components/ui/buttonStyles";

/**
 * These guards are a user-experience convenience only. The real authorisation
 * boundary is `firebase/firestore.rules` — an unverified user who bypasses the
 * client still cannot read another alumnus's document.
 */

export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingBlock label="Checking your session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

export function RequireVerified() {
  const { isAuthenticated, isVerified, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingBlock label="Checking your session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isVerified) {
    return (
      <div className="section py-20">
        <div className="card mx-auto max-w-lg px-8 py-12 text-center">
          <Lock className="mx-auto size-8 text-brand/60" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Awaiting verification</h1>
          <p className="mt-3 text-ink-soft">
            The alumni directory is open to verified members only. Two existing
            members need to vouch for you first — a complete profile with your
            batch and activities makes you much easier to recognise.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/profile" className={buttonClass("primary")}>
              Complete your profile
            </Link>
            <Link to="/" className={buttonClass("outline")}>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingBlock label="Checking your session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isAdmin) {
    return (
      <div className="section py-20">
        <div className="card mx-auto max-w-lg px-8 py-12 text-center">
          <ShieldCheck className="mx-auto size-8 text-brand/60" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Administrators only</h1>
          <p className="mt-3 text-ink-soft">
            This area is limited to the alumni committee. If you think you
            should have access, ask an existing administrator to grant it.
          </p>
          <Link to="/" className={buttonClass("primary", "md", "mt-6")}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
