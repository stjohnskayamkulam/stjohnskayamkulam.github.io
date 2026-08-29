import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Footer } from "@/components/layout/Footer";
import { PendingBanner } from "@/components/membership/PendingBanner";
import { RequiredProfileModal } from "@/components/auth/RequiredProfileModal";
import { useAuth } from "@/hooks/useAuth";
import { isProfileComplete } from "@/services/alumniService";
import { track } from "@/utils/analytics";

export function AppLayout() {
  const { pathname } = useLocation();
  const { session, loading } = useAuth();
  const needsRequired =
    !loading && Boolean(session) && !isProfileComplete(session?.profile);

  useEffect(() => {
    window.scrollTo(0, 0);
    track("page_view", { path: pathname });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col pb-24 lg:pb-0">
      <div
        className="flex min-h-dvh flex-1 flex-col"
        inert={needsRequired || undefined}
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
          {needsRequired ? null : <Outlet />}
        </main>
        <Footer />
        <MobileTabBar />
      </div>
      {needsRequired ? <RequiredProfileModal /> : null}
    </div>
  );
}
