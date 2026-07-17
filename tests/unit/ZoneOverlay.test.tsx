// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ZoneOverlay } from "@/components/floor-plan/ZoneOverlay";
import { OccupancyTooltip } from "@/components/floor-plan/OccupancyTooltip";

afterEach(() => cleanup());

describe("ZoneOverlay — tooltip on hover (no-data zones)", () => {
  // Regression: hovering over a zone with no occupancy data (e.g. BLD-001 F1
  // Zone-C) used to produce no tooltip because handleMouseMove was guarded by
  // `if (zoneData)`. The user got no feedback that the zone existed. The fix
  // synthesises a minimal stub { zone, floor, timestamp: null } so the
  // tooltip always appears and clearly says "No data".
  it("fires onHover even when zoneData is null so a 'no data' tooltip can show", () => {
    const onHover = vi.fn();
    const onLeave = vi.fn();

    render(
      <svg>
        <ZoneOverlay
          zoneData={null}
          zoneKey="Zone-C"
          floor={1}
          x={0}
          y={0}
          width={100}
          height={100}
          label="Server Room"
          onHover={onHover}
          onLeave={onLeave}
        />
      </svg>,
    );

    const rect = document.querySelector("rect")!;
    // jsdom doesn't compute pageX/pageY from the event init dict the way real
    // browsers do, so set them as instance properties on the event.
    const evt = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(evt, "pageX", { value: 100 });
    Object.defineProperty(evt, "pageY", { value: 200 });
    rect.dispatchEvent(evt);

    expect(onHover).toHaveBeenCalledTimes(1);
    // The stub is the zone key + floor, with timestamp: null
    expect(onHover).toHaveBeenCalledWith(
      expect.objectContaining({ zone: "Zone-C", floor: 1, timestamp: null }),
      100,
      200,
    );
  });

  it("fires onHover with the real zoneData when present", () => {
    const onHover = vi.fn();
    const realData = {
      zone: "Zone-A",
      floor: 1,
      personCount: 12,
      occupancyRatePercent: 50,
      timestamp: new Date().toISOString(),
    };

    render(
      <svg>
        <ZoneOverlay
          zoneData={realData}
          zoneKey="Zone-A"
          floor={1}
          x={0}
          y={0}
          width={100}
          height={100}
          label="Open Workspace"
          onHover={onHover}
          onLeave={() => {}}
        />
      </svg>,
    );

    const rect = document.querySelector("rect")!;
    const evt = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(evt, "pageX", { value: 50 });
    Object.defineProperty(evt, "pageY", { value: 60 });
    rect.dispatchEvent(evt);

    expect(onHover).toHaveBeenCalledWith(realData, 50, 60);
  });

  it("fires onLeave when the mouse leaves the zone", () => {
    const onLeave = vi.fn();
    render(
      <svg>
        <ZoneOverlay
          zoneData={null}
          zoneKey="Zone-C"
          floor={1}
          x={0}
          y={0}
          width={100}
          height={100}
          label="Server Room"
          onHover={() => {}}
          onLeave={onLeave}
        />
      </svg>,
    );

    const rect = document.querySelector("rect")!;
    fireEvent.mouseLeave(rect);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

describe("OccupancyTooltip — no-data state", () => {
  it("shows a 'No data' badge when timestamp is null", () => {
    render(
      <OccupancyTooltip
        data={{ zone: "Zone-C", floor: 1, timestamp: null }}
        pageX={0}
        pageY={0}
      />,
    );
    expect(screen.getByText("No data")).toBeTruthy();
    expect(screen.getByText("Zone-C")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy(); // floor
  });

  it("does NOT show the badge when timestamp is present", () => {
    render(
      <OccupancyTooltip
        data={{ zone: "Zone-A", floor: 1, timestamp: new Date().toISOString() }}
        pageX={0}
        pageY={0}
      />,
    );
    expect(screen.queryByText("No data")).toBeNull();
  });
});
