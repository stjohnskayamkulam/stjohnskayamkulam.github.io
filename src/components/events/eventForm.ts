import { EVENT_TYPE_LABELS, type EventType, type SchoolEvent } from "@/types";

export type EventWriteFields = Omit<
  SchoolEvent,
  "id" | "attendeeCount" | "createdAt" | "createdBy"
>;

export function parseEventForm(form: FormData): EventWriteFields {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const date = String(form.get("date") ?? "").trim();
  const startTime = String(form.get("startTime") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  const organizer = String(form.get("organizer") ?? "").trim();
  const eventType = form.get("eventType") as EventType;

  if (
    !title ||
    !description ||
    !date ||
    !startTime ||
    !location ||
    !organizer ||
    !(eventType in EVENT_TYPE_LABELS)
  ) {
    throw new Error(
      "Title, type, date, start time, location, organiser and description are required.",
    );
  }

  return {
    title,
    description,
    date,
    startTime,
    endTime: String(form.get("endTime") || "") || null,
    location,
    eventType,
    organizer,
    imageUrl: String(form.get("imageUrl") || "") || null,
    capacity: form.get("capacity") ? Number(form.get("capacity")) : null,
    classYear: form.get("classYear") ? Number(form.get("classYear")) : null,
  };
}
