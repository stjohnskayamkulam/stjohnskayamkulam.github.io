import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Trash2, UserCheck } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import {
  approveMember,
  getAdminStats,
  rejectMember,
} from "@/services/adminService";
import {
  approveApplicant,
  listPendingApplicants,
} from "@/services/membershipService";
import { createEvent, deleteEvent, listEvents } from "@/services/eventService";
import { searchAlumni } from "@/services/alumniService";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { cn } from "@/utils/cn";
import { ApplicantCard } from "@/components/membership/ApplicantCard";
import {
  EVENT_TYPE_LABELS,
  REQUIRED_APPROVALS,
  type EventType,
} from "@/types";
import { formatDate } from "@/utils/date";

type Tab = "approvals" | "members" | "events";

const TABS: { id: Tab; label: string }[] = [
  { id: "approvals", label: "Approvals" },
  { id: "members", label: "Members" },
  { id: "events", label: "Events" },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("approvals");
  const stats = useAsync(() => getAdminStats(), []);

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
        {TABS.map((entry) => (
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
  const [query, setQuery] = useState("");
  const members = useAsync(
    () => searchAlumni({ query: query || undefined }),
    [query],
  );

  return (
    <>
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
          {members.data?.map((person) => (
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
                <span className="ml-2 text-sm text-ink-soft">
                  Class of {person.gradYear}
                </span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function EventsTab({ onChange }: { onChange: () => void }) {
  const { session } = useAuth();
  const events = useAsync(() => listEvents(), []);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCreate(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    setSaving(true);
    try {
      await createEvent({
        title: String(form.get("title")),
        description: String(form.get("description")),
        date: String(form.get("date")),
        startTime: String(form.get("startTime")),
        endTime: String(form.get("endTime") || "") || undefined,
        location: String(form.get("location")),
        eventType: form.get("eventType") as EventType,
        organizer: String(form.get("organizer")),
        imageUrl: String(form.get("imageUrl") || "") || undefined,
        capacity: form.get("capacity") ? Number(form.get("capacity")) : null,
        classYear: form.get("classYear") ? Number(form.get("classYear")) : null,
        createdBy: session?.account.uid ?? "",
      });
      setCreating(false);
      events.reload();
      onChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setCreating((open) => !open)} className="mb-6">
        <CalendarPlus className="size-4" aria-hidden />
        New event
      </Button>

      {creating && (
        <form onSubmit={handleCreate} className="card mb-8 space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="title" label="Title" required />
            <SelectField name="eventType" label="Type" defaultValue="reunion">
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((value) => (
                <option key={value} value={value}>
                  {EVENT_TYPE_LABELS[value]}
                </option>
              ))}
            </SelectField>
            <TextField name="date" label="Date" type="date" required />
            <TextField
              name="startTime"
              label="Start time"
              type="time"
              required
            />
            <TextField name="endTime" label="End time" type="time" />
            <TextField name="location" label="Location" required />
            <TextField name="organizer" label="Organiser" required />
            <TextField
              name="capacity"
              label="Capacity"
              type="number"
              placeholder="Unlimited"
            />
            <TextField
              name="classYear"
              label="Class year"
              type="number"
              placeholder="All alumni"
            />
            <TextField name="imageUrl" label="Image URL" type="url" />
          </div>
          <TextAreaField name="description" label="Description" required />
          <div className="flex gap-3">
            <Button type="submit" loading={saving}>
              Create event
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
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
                onClick={async () => {
                  await deleteEvent(event.id);
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
