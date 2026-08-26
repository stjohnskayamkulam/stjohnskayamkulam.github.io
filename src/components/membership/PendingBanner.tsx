import { Link } from "react-router-dom";
import { Clock, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { approvalProgress } from "@/services/membershipService";
import { REQUIRED_APPROVALS } from "@/types";

/**
 * Unverified members can sign in, but the directory stays closed to them until
 * enough existing members vouch for them. This shows how far along they are.
 */
export function PendingBanner() {
  const { session } = useAuth();
  const status = session?.account.status;

  if (!session || status === "verified") return null;

  if (status === "rejected") {
    return (
      <div className="border-b border-red-100 bg-red-50">
        <div className="section flex items-start gap-3 py-3 text-sm text-red-800">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            We could not verify your membership.{" "}
            {session.account.statusNote ??
              "Please contact the alumni committee for help."}
          </p>
        </div>
      </div>
    );
  }

  const { count, remaining } = approvalProgress({
    approvedBy: session.profile?.approvedBy ?? [],
    status: status ?? "pending",
  });

  return (
    <div className="border-b border-amber-100 bg-amber-50">
      <div className="section flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm text-amber-900">
        <Clock className="size-4 shrink-0" aria-hidden />
        <p>
          {count === 0
            ? `${REQUIRED_APPROVALS} existing members need to vouch for you before the directory unlocks.`
            : `${count} of ${REQUIRED_APPROVALS} members have vouched for you — ${remaining} more and you are in.`}
        </p>
        <Link
          to="/profile"
          className="font-medium underline underline-offset-2"
        >
          Complete your profile
        </Link>
      </div>
    </div>
  );
}
