import { describe, it, expect } from "vitest";
import {
  TableNameSchema,
  QueryRequestBodySchema,
  OccupancyQueryParamsSchema,
} from "@/lib/schemas";

describe("TableNameSchema", () => {
  it("accepts valid table names", () => {
    expect(TableNameSchema.parse("energy_consumption")).toBe("energy_consumption");
    expect(TableNameSchema.parse("occupancy")).toBe("occupancy");
    expect(TableNameSchema.parse("hvac_performance")).toBe("hvac_performance");
    expect(TableNameSchema.parse("alerts_events")).toBe("alerts_events");
  });

  it("rejects invalid table names", () => {
    expect(() => TableNameSchema.parse("invalid_table")).toThrow();
    expect(() => TableNameSchema.parse("")).toThrow();
  });
});

describe("QueryRequestBodySchema", () => {
  const validConfig = {
    config: {
      id: "card-1",
      type: "kpi",
      title: "Total Energy",
      dataSource: "energy_consumption",
      xAxis: null,
      yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
      aggregation: "sum",
      groupBy: null,
      filter: null,
    },
    globalFilters: {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    },
  };

  it("validates a complete request body", () => {
    const result = QueryRequestBodySchema.parse(validConfig);
    expect(result.config.title).toBe("Total Energy");
  });

  it("rejects unknown aggregation type", () => {
    const bad = { ...validConfig, config: { ...validConfig.config, aggregation: "invalid" } };
    expect(() => QueryRequestBodySchema.parse(bad)).toThrow();
  });

  it("rejects unknown card type", () => {
    const bad = { ...validConfig, config: { ...validConfig.config, type: "pie" } };
    expect(() => QueryRequestBodySchema.parse(bad)).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => QueryRequestBodySchema.parse({})).toThrow();
  });
});

describe("OccupancyQueryParamsSchema", () => {
  it("accepts valid params", () => {
    const result = OccupancyQueryParamsSchema.parse({ building_id: "BLD-001", floor: "1" });
    expect(result.building_id).toBe("BLD-001");
    expect(result.floor).toBe(1);
  });

  it("rejects missing params", () => {
    expect(() => OccupancyQueryParamsSchema.parse({})).toThrow();
  });

  it("rejects non-numeric floor", () => {
    expect(() => OccupancyQueryParamsSchema.parse({ building_id: "BLD-001", floor: "abc" })).toThrow();
  });
});
