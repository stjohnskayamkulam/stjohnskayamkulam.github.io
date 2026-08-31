import { describe, expect, it } from "vitest";
import { parseEventForm } from "./eventForm";

describe("parseEventForm", () => {
  it("reads the fields an admin can edit", () => {
    const form = new FormData();
    form.set("title", " Silver jubilee ");
    form.set("description", "Come back.");
    form.set("date", "2026-10-10");
    form.set("startTime", "18:00");
    form.set("endTime", "21:00");
    form.set("location", "School hall");
    form.set("organizer", "Committee");
    form.set("eventType", "reunion");
    form.set("capacity", "120");
    form.set("classYear", "2001");

    expect(parseEventForm(form)).toEqual({
      title: "Silver jubilee",
      description: "Come back.",
      date: "2026-10-10",
      startTime: "18:00",
      endTime: "21:00",
      location: "School hall",
      organizer: "Committee",
      eventType: "reunion",
      imageUrl: null,
      capacity: 120,
      classYear: 2001,
    });
  });
});
