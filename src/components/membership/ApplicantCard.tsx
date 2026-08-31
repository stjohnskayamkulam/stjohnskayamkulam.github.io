import { Check, ShieldCheck, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { approvalProgress, canApprove } from "@/services/membershipService";
import { REQUIRED_APPROVALS, type AlumniProfile } from "@/types";
import { formatRelative } from "@/utils/date";
import { classOfLabel } from "@/utils/profile";

/**
 * One applicant waiting on peer approval. Used both on the member-facing
 * approvals page and in the admin dashboard, which passes the extra
 * `onReject`/`onOverride` actions the committee is allowed to take.
 */
export function ApplicantCard({
  applicant,
  viewerUid,
  busy = false,
  onApprove,
  onReject,
  onOverride,
}: {
  applicant: AlumniProfile;
  viewerUid: string | undefined;
  busy?: boolean;
  onApprove: () => void;
  onReject?: () => void;
  onOverride?: () => void;
}) {
  const { count, remaining } = approvalProgress(applicant);
  const eligible = canApprove(applicant, viewerUid);
  const alreadyApproved = Boolean(
    viewerUid && applicant.approvedBy.includes(viewerUid),
  );
  const isSelf = applicant.uid === viewerUid;

  return (
    <article className="card flex flex-wrap items-center gap-4 p-5">
      <Avatar name={applicant.fullName} src={applicant.photoURL} size="md" />
      <div className="min-w-48 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{applicant.fullName}</h3>
          <Badge tone={remaining === 0 ? "success" : "warning"}>
            {count} of {REQUIRED_APPROVALS} approvals
          </Badge>
        </div>
        <p className="text-sm text-ink-soft">
          {[classOfLabel(applicant.gradYear), applicant.batch, applicant.city]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Applied {formatRelative(applicant.createdAt)}
          {applicant.email && ` · ${applicant.email}`}
        </p>
        <ApprovalMeter count={count} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          loading={busy}
          disabled={!eligible}
          onClick={onApprove}
        >
          <Check className="size-4" aria-hidden />
          {alreadyApproved ? "You approved" : "Approve"}
        </Button>
        {onOverride && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onOverride}
            title="Verify without waiting for a second member"
          >
            <ShieldCheck className="size-4" aria-hidden />
            Verify now
          </Button>
        )}
        {onReject && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
            <X className="size-4" aria-hidden />
            Reject
          </Button>
        )}
      </div>

      {isSelf && (
        <p className="w-full text-xs text-ink-soft">
          This is your own application — you cannot approve it.
        </p>
      )}
    </article>
  );
}

function ApprovalMeter({ count }: { count: number }) {
  return (
    <div
      className="mt-3 flex gap-1.5"
      role="img"
      aria-label={`${count} of ${REQUIRED_APPROVALS} approvals received`}
    >
      {Array.from({ length: REQUIRED_APPROVALS }, (_, i) => (
        <span
          key={i}
          className={
            i < count
              ? "h-1.5 w-10 rounded-full bg-brand"
              : "h-1.5 w-10 rounded-full bg-black/10"
          }
        />
      ))}
    </div>
  );
}
