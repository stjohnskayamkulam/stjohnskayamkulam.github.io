import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import {
  RequireAdmin,
  RequireAuth,
  RequireVerified,
} from "@/components/auth/RouteGuards";
import { HomePage } from "@/pages/HomePage";
import { AboutPage } from "@/pages/AboutPage";
import { AlumniDirectoryPage } from "@/pages/AlumniDirectoryPage";
import { AlumniProfilePage } from "@/pages/AlumniProfilePage";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { ClassYearRedirect, MyClassRedirect } from "@/pages/ClassRedirects";
import { MapPage } from "@/pages/MapPage";
import { EventsPage } from "@/pages/EventsPage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ProfileEditPage } from "@/pages/ProfileEditPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AdminPage } from "@/pages/AdminPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public — enough to make the network worth joining, no personal data. */}
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Verified alumni only — anything that exposes other members. */}
        <Route element={<RequireVerified />}>
          <Route path="alumni" element={<AlumniDirectoryPage />} />
          <Route path="alumni/:uid" element={<AlumniProfilePage />} />
          <Route path="map" element={<MapPage />} />
          {/* Superseded by the directory's year filter; kept for old links. */}
          <Route path="my-class" element={<MyClassRedirect />} />
          <Route path="class/:year" element={<ClassYearRedirect />} />
          {/* Peer verification: any member can vouch for an applicant. */}
          <Route path="approvals" element={<ApprovalsPage />} />
        </Route>

        {/* Signed in, verification not required — your own account. */}
        <Route element={<RequireAuth />}>
          <Route path="profile" element={<ProfileEditPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
