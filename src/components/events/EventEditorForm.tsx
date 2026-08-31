import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { parseEventForm } from "@/components/events/eventForm";
import { EVENT_TYPE_LABELS, type EventType, type SchoolEvent } from "@/types";

interface EventEditorFormProps {
  event?: SchoolEvent;
  saving: boolean;
  error?: string | null;
  onSubmit: (fields: ReturnType<typeof parseEventForm>) => Promise<void>;
  onCancel: () => void;
}

export function EventEditorForm({
  event,
  saving,
  error,
  onSubmit,
  onCancel,
}: EventEditorFormProps) {
  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    await onSubmit(parseEventForm(new FormData(formEvent.currentTarget)));
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="card mb-8 space-y-4 p-6">
      <h2 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {event ? "Edit event" : "New event"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="title"
          label="Title"
          required
          defaultValue={event?.title ?? ""}
        />
        <SelectField
          name="eventType"
          label="Type"
          defaultValue={event?.eventType ?? "reunion"}
        >
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((value) => (
            <option key={value} value={value}>
              {EVENT_TYPE_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <TextField
          name="date"
          label="Date"
          type="date"
          required
          defaultValue={event?.date ?? ""}
        />
        <TextField
          name="startTime"
          label="Start time"
          type="time"
          required
          defaultValue={event?.startTime ?? ""}
        />
        <TextField
          name="endTime"
          label="End time"
          type="time"
          defaultValue={event?.endTime ?? ""}
        />
        <TextField
          name="location"
          label="Location"
          required
          defaultValue={event?.location ?? ""}
        />
        <TextField
          name="organizer"
          label="Organiser"
          required
          defaultValue={event?.organizer ?? ""}
        />
        <TextField
          name="capacity"
          label="Capacity"
          type="number"
          placeholder="Unlimited"
          defaultValue={event?.capacity ?? ""}
        />
        <TextField
          name="classYear"
          label="Class year"
          type="number"
          placeholder="All alumni"
          defaultValue={event?.classYear ?? ""}
        />
        <TextField
          name="imageUrl"
          label="Image URL"
          type="url"
          defaultValue={event?.imageUrl ?? ""}
        />
      </div>
      <TextAreaField
        name="description"
        label="Description"
        required
        defaultValue={event?.description ?? ""}
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" loading={saving}>
          {event ? "Save changes" : "Create event"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
