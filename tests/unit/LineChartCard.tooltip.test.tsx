// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { ScrollableTooltip } from "@/components/cards/LineChartCard";

afterEach(() => cleanup());

describe("ScrollableTooltip", () => {
  it("renders nothing when not active", () => {
    const { container } = render(
      <ScrollableTooltip active={false} payload={[{ name: "A", value: 1 }]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when payload is empty", () => {
    const { container } = render(<ScrollableTooltip active={true} payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("caps height and enables vertical scrolling for many series", () => {
    // 15-series payload — would overflow without scrolling
    const payload = Array.from({ length: 15 }, (_, i) => ({
      name: `Device-${i + 1}`,
      value: 10 + i,
      color: "#3b82f6",
      dataKey: `Device-${i + 1}`,
    }));

    render(<ScrollableTooltip active={true} payload={payload} label="2025-05-31T17:00" />);

    const tooltip = screen.getByTestId("scrollable-tooltip");
    expect(tooltip).toBeTruthy();
    // The className must cap the height and enable scrolling
    expect(tooltip.className).toContain("max-h-[200px]");
    expect(tooltip.className).toContain("overflow-y-auto");
  });

  it("renders all series as list items, not a few of them", () => {
    const payload = Array.from({ length: 12 }, (_, i) => ({
      name: `Device-${i + 1}`,
      value: 10 + i,
      color: "#3b82f6",
      dataKey: `Device-${i + 1}`,
    }));

    render(<ScrollableTooltip active={true} payload={payload} />);

    // Every series should be present, not just the first N that fit.
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(12);
  });

  it("shows the label as a sticky header when provided", () => {
    render(
      <ScrollableTooltip
        active={true}
        payload={[{ name: "A", value: 1, color: "#000" }]}
        label="2025-05-31T17:00:00.000Z"
      />,
    );

    const header = screen.getByText("2025-05-31T17:00:00.000Z");
    expect(header).toBeTruthy();
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("top-0");
  });

  it("formats numeric values to 2 decimal places", () => {
    render(
      <ScrollableTooltip
        active={true}
        payload={[{ name: "A", value: 12.345678, color: "#000", dataKey: "A" }]}
      />,
    );
    expect(screen.getByText("12.35")).toBeTruthy();
  });
});
