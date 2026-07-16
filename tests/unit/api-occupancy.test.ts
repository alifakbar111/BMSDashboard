import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { getLatestPerZone } from "../../src/app/api/occupancy/latest/route";

describe("getLatestPerZone", () => {
  it("returns latest reading per zone from sorted data", () => {
    const rows = [
      {
        zone: "Zone-A",
        timestamp: "2025-06-01T08:00:00Z",
        person_count: 120,
        occupancy_rate_percent: 80,
      },
      {
        zone: "Zone-A",
        timestamp: "2025-06-01T09:00:00Z",
        person_count: 100,
        occupancy_rate_percent: 67,
      },
      {
        zone: "Zone-B",
        timestamp: "2025-06-01T08:00:00Z",
        person_count: 62,
        occupancy_rate_percent: 78,
      },
    ];
    const result = getLatestPerZone(rows);
    expect(result).toHaveLength(2);
    const zoneA = result.find((r) => r.zone === "Zone-A");
    expect(zoneA!.person_count).toBe(100);
    expect(zoneA!.occupancy_rate_percent).toBe(67);
  });

  it("handles empty input", () => {
    const result = getLatestPerZone([]);
    expect(result).toEqual([]);
  });

  it("handles single zone single row", () => {
    const rows = [
      {
        zone: "Zone-A",
        timestamp: "2025-06-01T08:00:00Z",
        person_count: 50,
        occupancy_rate_percent: 33,
      },
    ];
    const result = getLatestPerZone(rows);
    expect(result).toHaveLength(1);
    expect(result[0].person_count).toBe(50);
  });
});
