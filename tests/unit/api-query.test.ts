import { describe, it, expect, vi } from "vitest";
import { processQueryResult } from "../../src/app/api/query/route";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("processQueryResult", () => {
  it("aggregates rows by sum", () => {
    const rows = [{ energy_kwh: 10 }, { energy_kwh: 20 }, { energy_kwh: 30 }];
    const result = processQueryResult(rows, "sum", "energy_kwh");
    expect(result.aggregated).toBe(60);
    expect(result.data).toEqual(rows);
  });

  it("aggregates rows by avg", () => {
    const rows = [{ energy_kwh: 10 }, { energy_kwh: 20 }, { energy_kwh: 30 }];
    const result = processQueryResult(rows, "avg", "energy_kwh");
    expect(result.aggregated).toBe(20);
  });

  it("handles empty rows", () => {
    const result = processQueryResult([], "sum", "energy_kwh");
    expect(result.aggregated).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("handles missing value field gracefully", () => {
    const rows = [{ zone: "A" }];
    const result = processQueryResult(rows, "sum", "energy_kwh");
    expect(result.aggregated).toBe(0);
  });
});
