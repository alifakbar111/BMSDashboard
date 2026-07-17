// tests/unit/queries.test.ts
import { describe, it, expect } from "vitest";
import { queryKeys } from "../../src/lib/queries";
import type { CardConfig, GlobalFilters } from "../../src/lib/schemas";

const FILTERS: GlobalFilters = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};

const CONFIG: CardConfig = {
  id: "k-1",
  type: "kpi",
  title: "x",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "energy_kwh", label: "kWh" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

describe("queryKeys", () => {
  it("root namespace is stable", () => {
    expect(queryKeys.all).toEqual(["bms"]);
  });

  it("card() returns the same shape every call for the same inputs", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("kpi", CONFIG, FILTERS);
    expect(a).toEqual(b);
    expect(a).toEqual(["kpi", CONFIG, FILTERS]);
  });

  it("card() varies on config identity (different id → different key)", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("kpi", { ...CONFIG, id: "k-2" }, FILTERS);
    expect(a).not.toEqual(b);
  });

  it("card() varies on filters", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("kpi", CONFIG, { ...FILTERS, buildingId: "BLD-001" });
    expect(a).not.toEqual(b);
  });

  it("card() varies on kind", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("bar", CONFIG, FILTERS);
    expect(a).not.toEqual(b);
  });

  it("occupancy() returns [occupancy, buildingId, floor] tuple", () => {
    expect(queryKeys.occupancy("BLD-001", 2)).toEqual([
      "occupancy",
      "BLD-001",
      2,
    ]);
  });
});
