import { describe, it, expect, vi } from "vitest";
import { processQueryResult } from "../../src/app/api/query/route";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("processQueryResult", () => {
  it("aggregates rows by sum", () => {
    // Use camelCase keys matching Prisma output shape
    const rows = [{ energyKwh: 10 }, { energyKwh: 20 }, { energyKwh: 30 }];
    const result = processQueryResult(rows, "sum", "energyKwh");
    expect(result.aggregated).toBe(60);
    expect(result.data).toEqual(rows);
  });

  it("aggregates rows by avg", () => {
    const rows = [{ energyKwh: 10 }, { energyKwh: 20 }, { energyKwh: 30 }];
    const result = processQueryResult(rows, "avg", "energyKwh");
    expect(result.aggregated).toBe(20);
  });

  it("handles empty rows", () => {
    const result = processQueryResult([], "sum", "energyKwh");
    expect(result.aggregated).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("handles missing value field gracefully", () => {
    const rows = [{ zone: "A" }];
    const result = processQueryResult(rows, "sum", "energyKwh");
    expect(result.aggregated).toBe(0);
  });
});
