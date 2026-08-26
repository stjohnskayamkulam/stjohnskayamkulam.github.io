/**
 * Thin analytics abstraction.
 *
 * The point is that call sites never import a vendor SDK. Today events go to
 * the console in dev and to Firebase Analytics when it is configured; swapping
 * in Plausible/GA4/PostHog later means editing only `sinks` below.
 */
import { analyticsDebug } from "@/config/env";

export type AnalyticsEvent =
  | "login"
  | "logout"
  | "registration"
  | "profile_completed"
  | "alumni_search"
  | "profile_view"
  | "class_view"
  | "event_view"
  | "event_rsvp"
  | "event_rsvp_cancelled"
  | "page_view"
  | "member_approved"
  | "admin_action";

export type AnalyticsParams = Record<
  string,
  string | number | boolean | null | undefined
>;

type Sink = (event: AnalyticsEvent, params: AnalyticsParams) => void;

const consoleSink: Sink = (event, params) => {
  if (!analyticsDebug) return;
  console.debug(`[analytics] ${event}`, params);
};

const sinks: Sink[] = [consoleSink];

/** Lets the Firebase layer attach itself without this module importing Firebase. */
export function registerAnalyticsSink(sink: Sink): void {
  sinks.push(sink);
}

export function track(
  event: AnalyticsEvent,
  params: AnalyticsParams = {},
): void {
  for (const sink of sinks) {
    try {
      sink(event, params);
    } catch {
      // Analytics must never break a user flow.
    }
  }
}
