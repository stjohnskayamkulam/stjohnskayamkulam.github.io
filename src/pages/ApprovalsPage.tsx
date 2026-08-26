import { useState } from "react";
import { UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAsync } from "@/hooks/useAsync";
import {
  approveApplicant,
  listPendingApplicants,
} from "@/services/membershipService";
import { ApplicantCard } from "@/components/membership/ApplicantCard";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { REQUIRED_APPROVALS } from "@/types";

/**
 * Peer approval queue. Every verified member — not just the committee — can
 * vouch for people they recognise, and an applicant is let in as soon as
 * `REQUIRED_APPROVALS` different members have.
 */
export function ApprovalsPage() {
  const { session } = useAuth();
  const viewerUid = session?.account.uid;
  const applicants = useAsync(() => listPendingApplicants(), []);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(uid: string) {
    if (!viewerUid) return;
    setBusyUid(uid);
    setError(null);
    try {
      await approveApplicant(uid, viewerUid);
      applicants.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "That approval did not save.",
      );
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="section py-12">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          Keeping us us
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Approve new members
        </h1>
        <p className="mt-3 text-ink-soft">
          The directory holds real contact details, so nobody gets in on their
          word alone. An applicant needs {REQUIRED_APPROVALS} existing members
          to vouch for them. Only approve people you actually recognise as
          Johnians — if you are unsure, leave them for someone from their batch.
        </p>
      </header>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      {applicants.loading && <LoadingBlock label="Loading applicants…" />}
      {applicants.error && (
        <ErrorState error={applicants.error} onRetry={applicants.reload} />
      )}

      {applicants.data && !applicants.data.length && (
        <EmptyState
          icon={<UserCheck className="size-8" />}
          title="Nobody is waiting"
          description="New registrations will show up here for you to vouch for."
        />
      )}

      {Boolean(applicants.data?.length) && (
        <div className="space-y-4">
          {applicants.data?.map((applicant) => (
            <ApplicantCard
              key={applicant.uid}
              applicant={applicant}
              viewerUid={viewerUid}
              busy={busyUid === applicant.uid}
              onApprove={() => approve(applicant.uid)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
