import { describe, it, expect } from "vitest";
import { aggregate } from "../../src/lib/aggregation";

describe("aggregate", () => {
  const values = [10, 20, 30, 40, 50];

  it("returns sum of values", () => {
    expect(aggregate(values, "sum")).toBe(150);
  });

  it("returns average of values", () => {
    expect(aggregate(values, "avg")).toBe(30);
  });

  it("returns minimum of values", () => {
    expect(aggregate(values, "min")).toBe(10);
  });

  it("returns maximum of values", () => {
    expect(aggregate(values, "max")).toBe(50);
  });

  it("returns count of values", () => {
    expect(aggregate(values, "count")).toBe(5);
  });

  it("returns 0 for empty array with count", () => {
    expect(aggregate([], "count")).toBe(0);
  });

  it("returns 0 for empty array with sum", () => {
    expect(aggregate([], "sum")).toBe(0);
  });

  it("throws for unsupported aggregation type", () => {
    expect(() => aggregate([1, 2], "unknown" as any)).toThrow("Unknown aggregation type: unknown");
  });
});
