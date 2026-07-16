import type { AggregationType } from "./types";

export function aggregate(values: number[], type: AggregationType): number {
  if (values.length === 0 && type !== "count") return 0;

  switch (type) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "count":
      return values.length;
    default:
      throw new Error(`Unknown aggregation type: ${type}`);
  }
}
