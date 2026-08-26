import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("falls back to initials when the photo fails to load", () => {
    // Profile photos point at third-party hosts, so URLs rot. A directory of
    // 300 people must not fill with broken-image icons.
    const { container } = render(
      <Avatar name="Sunitha Menon" src="https://example.com/x.jpg" />,
    );
    const img = container.querySelector("img")!;
    expect(img).toBeInTheDocument();

    fireEvent.error(img);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("SM")).toBeInTheDocument();
  });

  it("shows initials when no photo is set", () => {
    render(<Avatar name="Thomas Varghese" />);
    expect(screen.getByText("TV")).toBeInTheDocument();
  });

  it("gives a new photo a fresh chance after a previous one failed", () => {
    const { container, rerender } = render(
      <Avatar name="First Person" src="https://example.com/gone.jpg" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByText("FP")).toBeInTheDocument();

    rerender(
      <Avatar name="Second Person" src="https://example.com/good.jpg" />,
    );
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});
