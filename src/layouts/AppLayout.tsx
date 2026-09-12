import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Footer } from "@/components/layout/Footer";
import { PendingBanner } from "@/components/membership/PendingBanner";
import { ConsentModal } from "@/components/auth/ConsentModal";
import { RequiredProfileModal } from "@/components/auth/RequiredProfileModal";
import { useAuth } from "@/hooks/useAuth";
import { sessionNeedsRequiredProfile } from "@/services/alumniService";
import { sessionNeedsConsent } from "@/services/consentService";
import { track } from "@/utils/analytics";

export function AppLayout() {
  const { pathname } = useLocation();
  const { session, loading } = useAuth();
  const readingNotice = pathname === "/privacy";
  // Existing members who joined before the notice, and anyone who skipped Join,
  // must agree before the rest of the site. The notice itself stays readable.
  const needsConsent =
    !loading && !readingNotice && sessionNeedsConsent(session);
  // First Google sign-in and later visits share this gate. An existing member
  // who never filled classes, city or the 10th-standard year is blocked too.
  const needsRequired =
    !loading &&
    !needsConsent &&
    !readingNotice &&
    sessionNeedsRequiredProfile(session);
  const gated = needsConsent || needsRequired;

  useEffect(() => {
    window.scrollTo(0, 0);
    track("page_view", { path: pathname });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col pb-24 lg:pb-0">
      <div
        className="flex min-h-dvh flex-1 flex-col"
        inert={gated || undefined}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Navbar />
        <PendingBanner />
        <main id="main" className="flex-1">
          {gated ? null : <Outlet />}
        </main>
        <Footer />
        <MobileTabBar />
      </div>
      {needsConsent ? <ConsentModal /> : null}
      {needsRequired ? <RequiredProfileModal /> : null}
    </div>
  );
}
