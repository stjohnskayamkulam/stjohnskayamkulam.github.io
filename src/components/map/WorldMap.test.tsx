import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WorldMap } from "./WorldMap";
import type { MapPin } from "@/utils/mapPins";

function pin(overrides: Partial<MapPin> = {}): MapPin {
  return {
    id: "12.9716,77.5946",
    coords: [12.9716, 77.5946],
    precision: "city",
    label: "Bengaluru, India",
    people: [
      {
        uid: "a-mariathomas",
        fullName: "Maria Thomas",
        gradYear: 1997,
        profession: "Founder & CEO",
        company: "Kadal Labs",
        locationLabel: "Bengaluru, India",
      },
    ],
    ...overrides,
  };
}

describe("WorldMap", () => {
  it("renders one focusable control per location", async () => {
    render(
      <WorldMap
        pins={[
          pin(),
          pin({
            id: "t",
            coords: [43.6532, -79.3832],
            label: "Toronto, Canada",
          }),
        ]}
        selectedPinId={null}
        onSelectPin={() => {}}
      />,
    );

    expect(
      await screen.findByLabelText("Bengaluru, India: 1 alumnus"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Toronto, Canada: 1 alumnus"),
    ).toBeInTheDocument();
  });

  it("shows who is there on hover and hides it again on leave", async () => {
    render(
      <WorldMap pins={[pin()]} selectedPinId={null} onSelectPin={() => {}} />,
    );
    const marker = await screen.findByLabelText("Bengaluru, India: 1 alumnus");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(marker.parentElement!);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Maria Thomas");
    expect(tooltip).toHaveTextContent("Founder & CEO");

    fireEvent.mouseLeave(marker.parentElement!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("reveals the same detail on keyboard focus, not just hover", async () => {
    // Hover-only detail would make the map unusable by keyboard and on touch.
    render(
      <WorldMap pins={[pin()]} selectedPinId={null} onSelectPin={() => {}} />,
    );
    const marker = await screen.findByLabelText("Bengaluru, India: 1 alumnus");

    fireEvent.focus(marker);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Maria Thomas");
  });

  it("selects and deselects a location when its pin is activated", async () => {
    const onSelectPin = vi.fn();
    const { rerender } = render(
      <WorldMap
        pins={[pin()]}
        selectedPinId={null}
        onSelectPin={onSelectPin}
      />,
    );

    const marker = await screen.findByLabelText("Bengaluru, India: 1 alumnus");
    fireEvent.click(marker);
    expect(onSelectPin).toHaveBeenCalledWith("12.9716,77.5946");

    rerender(
      <WorldMap
        pins={[pin()]}
        selectedPinId="12.9716,77.5946"
        onSelectPin={onSelectPin}
      />,
    );
    fireEvent.click(screen.getByLabelText("Bengaluru, India: 1 alumnus"));
    expect(onSelectPin).toHaveBeenLastCalledWith(null);
  });

  it("truncates a crowded pin rather than overflowing the tooltip", async () => {
    const crowd = pin({
      people: Array.from({ length: 9 }, (_, i) => ({
        uid: `u-${i}`,
        fullName: `Person ${i}`,
        gradYear: 2000 + i,
        locationLabel: "Bengaluru, India",
      })),
    });

    render(
      <WorldMap pins={[crowd]} selectedPinId={null} onSelectPin={() => {}} />,
    );
    const marker = await screen.findByLabelText("Bengaluru, India: 9 alumni");
    fireEvent.focus(marker);

    expect(screen.getByRole("tooltip")).toHaveTextContent("+3 more");
  });

  it("says the city is unknown on a country-level pin", async () => {
    render(
      <WorldMap
        pins={[pin({ precision: "country", label: "India" })]}
        selectedPinId={null}
        onSelectPin={() => {}}
      />,
    );

    fireEvent.focus(await screen.findByLabelText("India: 1 alumnus"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("city not shared");
  });

  it("still plots pins when the land geometry fails to load", async () => {
    // The atlas is a lazy import; a chunk that fails to arrive must not take the
    // data down with it.
    vi.doMock("./worldAtlas", () => ({
      loadCountryOutlines: () => Promise.reject(new Error("offline")),
    }));
    vi.resetModules();
    const { WorldMap: Fresh } = await import("./WorldMap");

    render(
      <Fresh pins={[pin()]} selectedPinId={null} onSelectPin={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    });
    vi.doUnmock("./worldAtlas");
  });
});
