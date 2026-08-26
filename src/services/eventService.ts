/** Events and RSVPs. */
import { getDataProvider } from "@/services";
import type { ListOptions } from "@/services/providers/types";
import type { EventAttendee, SchoolEvent } from "@/types";
import { track } from "@/utils/analytics";

export async function listEvents(
  options?: ListOptions & { upcomingOnly?: boolean; classYear?: number },
): Promise<SchoolEvent[]> {
  return (await getDataProvider()).listEvents(options);
}

export async function getEvent(id: string): Promise<SchoolEvent | null> {
  const event = await (await getDataProvider()).getEvent(id);
  if (event) track("event_view", { eventId: id, eventType: event.eventType });
  return event;
}

export async function listAttendees(eventId: string): Promise<EventAttendee[]> {
  return (await getDataProvider()).listAttendees(eventId);
}

export async function rsvp(
  eventId: string,
  attendee: EventAttendee,
): Promise<void> {
  await (await getDataProvider()).rsvp(eventId, attendee);
  track("event_rsvp", { eventId, gradYear: attendee.gradYear });
}

export async function cancelRsvp(eventId: string, uid: string): Promise<void> {
  await (await getDataProvider()).cancelRsvp(eventId, uid);
  track("event_rsvp_cancelled", { eventId });
}

export async function createEvent(
  input: Omit<SchoolEvent, "id" | "attendeeCount" | "createdAt">,
): Promise<SchoolEvent> {
  const event = await (await getDataProvider()).createEvent(input);
  track("admin_action", { action: "event_created", eventId: event.id });
  return event;
}

export async function updateEvent(
  id: string,
  patch: Partial<SchoolEvent>,
): Promise<SchoolEvent> {
  return (await getDataProvider()).updateEvent(id, patch);
}

export async function deleteEvent(id: string): Promise<void> {
  await (await getDataProvider()).deleteEvent(id);
  track("admin_action", { action: "event_deleted", eventId: id });
}
