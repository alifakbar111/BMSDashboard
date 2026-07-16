import { describe, it, expect } from "vitest";
import { buildWhereClause, buildQuery } from "../../src/lib/query-builder";
import type { CardConfig, GlobalFilters, FilterConfig } from "../../src/lib/types";

describe("buildWhereClause", () => {
  it("returns empty object when no filters set", () => {
    const filters: GlobalFilters = {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    expect(buildWhereClause(filters)).toEqual({});
  });

  it("adds buildingId filter", () => {
    const filters: GlobalFilters = {
      buildingId: "BLD-001",
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    expect(buildWhereClause(filters)).toEqual({ buildingId: "BLD-001" });
  });

  it("adds floor filter", () => {
    const filters: GlobalFilters = {
      buildingId: null,
      floor: 1,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    expect(buildWhereClause(filters)).toEqual({ floor: 1 });
  });

  it("adds timeRange filter for today", () => {
    const filters: GlobalFilters = {
      buildingId: null,
      floor: null,
      timeRange: "today",
      customStart: null,
      customEnd: null,
    };
    const result = buildWhereClause(filters);
    expect(result).toHaveProperty("timestamp");
  });

  it("merges global filters with card filter", () => {
    const filters: GlobalFilters = {
      buildingId: "BLD-001",
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    const cardFilter: FilterConfig = { field: "zone", operator: "eq", value: "Zone-A" };
    const result = buildWhereClause(filters, cardFilter);
    expect(result).toHaveProperty("buildingId", "BLD-001");
    expect(result).toHaveProperty("zone", "Zone-A");
  });
});

describe("buildQuery", () => {
  it("returns query for KPI card", () => {
    const config: CardConfig = {
      id: "card-1",
      type: "kpi",
      title: "Total Energy",
      dataSource: "energy_consumption",
      xAxis: null,
      yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
      aggregation: "sum",
      groupBy: null,
      filter: null,
    };
    const filters: GlobalFilters = {
      buildingId: "BLD-001",
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    const query = buildQuery(config, filters);
    expect(query.table).toBe("energy_consumption");
    expect(query.where).toHaveProperty("buildingId", "BLD-001");
  });

  it("returns query for Bar chart with xAxis and yAxis", () => {
    const config: CardConfig = {
      id: "card-2",
      type: "bar",
      title: "Energy by Zone",
      dataSource: "energy_consumption",
      xAxis: { field: "zone", label: "Zone" },
      yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
      aggregation: "sum",
      groupBy: null,
      filter: null,
    };
    const filters: GlobalFilters = {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    const query = buildQuery(config, filters);
    expect(query.table).toBe("energy_consumption");
    expect(query.groupBy).toContain("zone");
    expect(query.select).toHaveProperty("zone");
  });
});
