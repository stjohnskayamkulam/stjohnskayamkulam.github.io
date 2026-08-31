import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Pencil, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import {
  approveMember,
  getAdminStats,
  listAccounts,
  rejectMember,
  setUserRole,
} from "@/services/adminService";
import {
  approveApplicant,
  listPendingApplicants,
} from "@/services/membershipService";
import { createEvent, deleteEvent, listEvents, updateEvent } from "@/services/eventService";
import { searchAlumni } from "@/services/alumniService";
import { EventEditorForm } from "@/components/events/EventEditorForm";
import type { EventWriteFields } from "@/components/events/eventForm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { buttonClass } from "@/components/ui/buttonStyles";
import { ApplicantCard } from "@/components/membership/ApplicantCard";
import { isSuperAdminEmail, SUPERADMIN_EMAIL } from "@/config/admins";
import { REQUIRED_APPROVALS, type UserAccount } from "@/types";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/cn";
import { classOfLabel } from "@/utils/profile";

type Tab = "approvals" | "members" | "events" | "admins";

const TABS: { id: Tab; label: string }[] = [
  { id: "approvals", label: "Approvals" },
  { id: "members", label: "Members" },
  { id: "events", label: "Events" },
];

export function AdminPage() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("approvals");
  const stats = useAsync(() => getAdminStats(), []);

  const tabs = isSuperAdmin
    ? [...TABS, { id: "admins" as const, label: "Admins" }]
    : TABS;

  return (
    <div className="section py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          Committee tools
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Admin dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Everything here is also enforced by Firestore security rules — this
          page is convenience, not the permission boundary.
        </p>
      </header>

      <dl className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total alumni" value={stats.data?.totalAlumni} />
        <StatCard
          label="Pending approvals"
          value={stats.data?.pendingApprovals}
          highlight
        />
        <StatCard label="Upcoming events" value={stats.data?.upcomingEvents} />
        <StatCard label="Active classes" value={stats.data?.activeClasses} />
        <StatCard
          label="New this month"
          value={stats.data?.newMembersThisMonth}
        />
      </dl>

      <div className="mb-8 flex flex-wrap gap-2 border-b border-black/5 pb-px">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setTab(entry.id)}
            aria-current={tab === entry.id}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === entry.id
                ? "border-brand text-brand"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "approvals" && <ApprovalsTab onChange={stats.reload} />}
      {tab === "members" && <MembersTab />}
      {tab === "events" && <EventsTab onChange={stats.reload} />}
      {tab === "admins" && isSuperAdmin && <AdminsTab />}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "card flex flex-col-reverse p-5",
        highlight && value ? "border-l-4 border-l-accent" : undefined,
      )}
    >
      <dt className="mt-1 text-xs tracking-wide text-ink-soft uppercase">
        {label}
      </dt>
      <dd className="font-display text-3xl font-semibold text-ink">
        {value == null ? <span className="opacity-30">—</span> : value}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ApprovalsTab({ onChange }: { onChange: () => void }) {
  const { session } = useAuth();
  const pending = useAsync(() => listPendingApplicants(), []);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  async function act(uid: string, action: "approve" | "override" | "reject") {
    setBusyUid(uid);
    try {
      if (action === "approve") {
        await approveApplicant(uid, session!.account.uid);
      } else if (action === "override") {
        await approveMember(uid);
      } else {
        await rejectMember(
          uid,
          "We could not match this registration to our records.",
        );
      }
      pending.reload();
      onChange();
    } finally {
      setBusyUid(null);
    }
  }

  if (pending.loading) return <LoadingBlock />;
  if (!pending.data?.length) {
    return (
      <EmptyState
        icon={<UserCheck className="size-8" />}
        title="No one is waiting"
        description="New registrations will appear here for review."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Applicants are verified automatically once {REQUIRED_APPROVALS} members
        vouch for them. Use <strong>Verify now</strong> only when you have
        confirmed someone offline, or to seed a directory that does not yet have
        {" "}{REQUIRED_APPROVALS} members to do the vouching.
      </p>
      {pending.data.map((person) => (
        <ApplicantCard
          key={person.uid}
          applicant={person}
          viewerUid={session?.account.uid}
          busy={busyUid === person.uid}
          onApprove={() => act(person.uid, "approve")}
          onOverride={() => act(person.uid, "override")}
          onReject={() => act(person.uid, "reject")}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MembersTab() {
  const { isSuperAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const members = useAsync(
    () => searchAlumni({ query: query || undefined }),
    [query],
  );
  const accounts = useAsync(
    () => (isSuperAdmin ? listAccounts() : Promise.resolve([])),
    [isSuperAdmin],
  );
  const roles = useRoleActions(accounts.reload);

  const accountByUid = new Map(
    (accounts.data ?? []).map((account) => [account.uid, account]),
  );

  return (
    <>
      {isSuperAdmin && (
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          You can appoint a verified member as an administrator from this list,
          or open the Admins tab to search by email — including people who have
          not yet been verified.
        </p>
      )}
      {roles.error && (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {roles.error}
        </p>
      )}
      <TextField
        label="Find a member"
        placeholder="Search by name, company or city"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6 max-w-md"
      />

      {members.loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-3">
          {members.data?.map((person) => {
            const account = accountByUid.get(person.uid);
            const canAppoint =
              isSuperAdmin &&
              account &&
              account.role === "member" &&
              !isSuperAdminEmail(account.email);
            const canRevoke =
              isSuperAdmin &&
              account &&
              account.role === "admin" &&
              !isSuperAdminEmail(account.email);

            return (
              <article
                key={person.uid}
                className="card flex flex-wrap items-center gap-4 p-4"
              >
                <Avatar name={person.fullName} src={person.photoURL} size="sm" />
                <Link
                  to={`/alumni/${person.uid}`}
                  className="min-w-40 flex-1 hover:text-brand"
                >
                  <span className="font-medium">{person.fullName}</span>
                  {classOfLabel(person.gradYear) && (
                    <span className="ml-2 text-sm text-ink-soft">
                      {classOfLabel(person.gradYear)}
                    </span>
                  )}
                </Link>
                {account && isSuperAdmin && (
                  <RoleBadge account={account} />
                )}
                {isSuperAdmin && (
                  <Link
                    to={`/alumni/${person.uid}/edit`}
                    className={buttonClass("outline", "sm")}
                  >
                    Edit profile
                  </Link>
                )}
                {canAppoint && (
                  <Button
                    size="sm"
                    onClick={() => roles.assign(person.uid, "admin")}
                    loading={roles.busyUid === person.uid}
                    disabled={roles.busyUid === person.uid}
                  >
                    Make admin
                  </Button>
                )}
                {canRevoke && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => roles.assign(person.uid, "member")}
                    loading={roles.busyUid === person.uid}
                    disabled={roles.busyUid === person.uid}
                  >
                    Remove admin
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function useRoleActions(onChanged: () => void) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assign(uid: string, role: "member" | "admin") {
    setBusyUid(uid);
    setError(null);
    try {
      await setUserRole(uid, role);
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update that role.",
      );
    } finally {
      setBusyUid(null);
    }
  }

  return { busyUid, error, assign };
}

function AdminsTab() {
  const [query, setQuery] = useState("");
  const accounts = useAsync(() => listAccounts(), []);
  const roles = useRoleActions(accounts.reload);

  const needle = query.trim().toLowerCase();
  const rows = (accounts.data ?? []).filter((account) => {
    if (!needle) return true;
    return (
      account.displayName.toLowerCase().includes(needle) ||
      account.email.toLowerCase().includes(needle)
    );
  });

  const staff = rows
    .filter(
      (account) =>
        account.role === "admin" ||
        account.role === "superadmin" ||
        isSuperAdminEmail(account.email),
    )
    .sort((a, b) => {
      const rank = (account: UserAccount) =>
        isSuperAdminEmail(account.email) || account.role === "superadmin"
          ? 0
          : 1;
      return rank(a) - rank(b) || a.displayName.localeCompare(b.displayName);
    });

  const candidates = rows
    .filter(
      (account) =>
        account.role === "member" && !isSuperAdminEmail(account.email),
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  if (accounts.loading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-ink-soft">
        Only {SUPERADMIN_EMAIL} can appoint or remove administrators. People you
        appoint can moderate membership and events; they cannot mint more
        admins. A pending member is verified when they become an admin.
      </p>

      {roles.error && (
        <p className="text-sm text-red-700" role="alert">
          {roles.error}
        </p>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Administrators</h2>
        {staff.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="size-8" />}
            title="No administrators found"
            description="Accounts with admin access will appear here."
          />
        ) : (
          <div className="space-y-3">
            {staff.map((account) => (
              <AdminAccountRow
                key={account.uid}
                account={account}
                busy={roles.busyUid === account.uid}
                onRevoke={
                  account.role === "admin" && !isSuperAdminEmail(account.email)
                    ? () => roles.assign(account.uid, "member")
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Add an administrator</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Choose a member below, or filter by name or email.
        </p>
        <TextField
          label="Find a member"
          placeholder="Name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mb-6 max-w-md"
        />
        {candidates.length === 0 ? (
          <p className="text-sm text-ink-soft">
            {needle
              ? "No members match that search who are not already an administrator."
              : "Everyone with an account is already an administrator."}
          </p>
        ) : (
          <div className="space-y-3">
            {candidates.map((account) => (
              <AdminAccountRow
                key={account.uid}
                account={account}
                busy={roles.busyUid === account.uid}
                onAppoint={() => roles.assign(account.uid, "admin")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleBadge({ account }: { account: UserAccount }) {
  const bootstrap = isSuperAdminEmail(account.email);
  if (bootstrap || account.role === "superadmin") {
    return <Badge tone="brand">Superadmin</Badge>;
  }
  if (account.role === "admin") {
    return <Badge tone="accent">Admin</Badge>;
  }
  return <Badge tone="neutral">{account.status}</Badge>;
}

function AdminAccountRow({
  account,
  busy,
  onAppoint,
  onRevoke,
}: {
  account: UserAccount;
  busy: boolean;
  onAppoint?: () => void;
  onRevoke?: () => void;
}) {
  return (
    <article className="card flex flex-wrap items-center gap-4 p-4">
      <Avatar name={account.displayName} src={account.photoURL} size="sm" />
      <div className="min-w-40 flex-1">
        <p className="font-medium">{account.displayName}</p>
        <p className="text-sm text-ink-soft">{account.email}</p>
      </div>
      <RoleBadge account={account} />
      <Link
        to={`/alumni/${account.uid}/edit`}
        className={buttonClass("outline", "sm")}
      >
        Edit profile
      </Link>
      {onAppoint && (
        <Button
          size="sm"
          onClick={onAppoint}
          loading={busy}
          disabled={busy}
        >
          Make admin
        </Button>
      )}
      {onRevoke && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRevoke}
          loading={busy}
          disabled={busy}
        >
          Remove admin
        </Button>
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- */

function EventsTab({ onChange }: { onChange: () => void }) {
  const { session } = useAuth();
  const events = useAsync(() => listEvents(), []);
  const [draft, setDraft] = useState<"new" | string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing =
    draft && draft !== "new"
      ? (events.data?.find((event) => event.id === draft) ?? null)
      : null;

  async function handleSave(fields: EventWriteFields) {
    setSaving(true);
    setError(null);
    try {
      if (draft && draft !== "new") {
        await updateEvent(draft, fields);
      } else {
        await createEvent({
          ...fields,
          createdBy: session?.account.uid ?? "",
        });
      }
      setDraft(null);
      events.reload();
      onChange();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this event.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          setError(null);
          setDraft((open) => (open === "new" ? null : "new"));
        }}
        className="mb-6"
      >
        <CalendarPlus className="size-4" aria-hidden />
        New event
      </Button>

      {draft === "new" && (
        <EventEditorForm
          saving={saving}
          error={error}
          onSubmit={handleSave}
          onCancel={() => {
            setDraft(null);
            setError(null);
          }}
        />
      )}
      {editing && (
        <EventEditorForm
          key={editing.id}
          event={editing}
          saving={saving}
          error={error}
          onSubmit={handleSave}
          onCancel={() => {
            setDraft(null);
            setError(null);
          }}
        />
      )}

      {events.loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-3">
          {events.data?.map((event) => (
            <article
              key={event.id}
              className="card flex flex-wrap items-center gap-4 p-4"
            >
              <Link
                to={`/events/${event.id}`}
                className="min-w-48 flex-1 hover:text-brand"
              >
                <span className="font-medium">{event.title}</span>
                <span className="ml-2 text-sm text-ink-soft">
                  {formatDate(event.date)}
                </span>
              </Link>
              <Badge>{event.attendeeCount} attending</Badge>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setDraft(event.id);
                }}
                className="rounded-full p-2 text-ink-soft hover:bg-black/5 hover:text-ink"
                aria-label={`Edit ${event.title}`}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteEvent(event.id);
                  if (draft === event.id) setDraft(null);
                  events.reload();
                  onChange();
                }}
                className="rounded-full p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${event.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
