import { describe, it, expect } from "vitest";
import { getTableColumns } from "../../src/app/api/columns/route";

describe("getTableColumns", () => {
  it("returns columns for energy_consumption", () => {
    const columns = getTableColumns("energy_consumption");
    expect(columns.length).toBeGreaterThan(0);
    const energyKwh = columns.find((c) => c.column_name === "energy_kwh");
    expect(energyKwh).toBeDefined();
    expect(energyKwh!.is_numeric).toBe(true);
  });

  it("returns columns for hvac_performance", () => {
    const columns = getTableColumns("hvac_performance");
    const actualTempC = columns.find((c) => c.column_name === "actual_temp_c");
    expect(actualTempC).toBeDefined();
    expect(actualTempC!.is_numeric).toBe(true);
  });

  it("throws for unknown table", () => {
    expect(() => getTableColumns("unknown" as any)).toThrow("Unknown data source");
  });

  it("marks zone as non-numeric", () => {
    const columns = getTableColumns("energy_consumption");
    const zoneCol = columns.find((c) => c.column_name === "zone");
    expect(zoneCol).toBeDefined();
    expect(zoneCol!.is_numeric).toBe(false);
  });
});
