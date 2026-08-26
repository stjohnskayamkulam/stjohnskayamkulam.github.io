import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Class browsing lives inside the directory now. These keep the old, shareable
 * `/my-class` and `/class/:year` links landing in the right place.
 */
export function MyClassRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  const year = session?.profile?.gradYear;
  // Without a recorded year the directory itself offers to set one.
  return <Navigate to={year ? `/alumni?year=${year}` : "/alumni"} replace />;
}

export function ClassYearRedirect() {
  const { year = "" } = useParams();
  const parsed = Number(year);
  const valid = Number.isInteger(parsed) && parsed >= 1900;
  return <Navigate to={valid ? `/alumni?year=${parsed}` : "/alumni"} replace />;
}
