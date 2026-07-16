import { z } from "zod";

// ── Primitives ──────────────────────────────────────────────

export const TableNameSchema = z.enum([
  "energy_consumption",
  "hvac_performance",
  "occupancy",
  "alerts_events",
]);

export const CardTypeSchema = z.enum(["kpi", "bar", "line", "gauge"]).describe("Card visualization type");

export const AggregationTypeSchema = z
  .enum(["sum", "avg", "min", "max", "count"])
  .describe("Aggregation function to apply");

export const OperatorSchema = z
  .enum(["eq", "neq", "gt", "gte", "lt", "lte"])
  .describe("Comparison operator");

// ── Composite Schemas ──────────────────────────────────────

export const AxisConfigSchema = z.object({
  field: z.string().describe("Column name"),
  label: z.string().describe("Display label"),
});

export const FilterConfigSchema = z.object({
  field: z.string().describe("Column to filter on"),
  operator: OperatorSchema,
  value: z.union([z.string(), z.number()]).describe("Filter value"),
});

export const CardConfigSchema = z.object({
  id: z.string().describe("Unique card identifier"),
  type: CardTypeSchema,
  title: z.string().describe("Card display title"),
  dataSource: TableNameSchema.nullable().describe("Data source table name"),
  xAxis: AxisConfigSchema.nullable().describe("X-axis field (for Bar/Line charts)"),
  yAxis: AxisConfigSchema.nullable().describe("Y-axis / value field"),
  aggregation: AggregationTypeSchema,
  groupBy: AxisConfigSchema.nullable().describe("Group-by field (for series in Line charts)"),
  filter: FilterConfigSchema.nullable().describe("Card-level filter"),
  gaugeMin: z.number().optional().describe("Gauge minimum value"),
  gaugeMax: z.number().optional().describe("Gauge maximum value"),
  gaugeTarget: z.number().optional().describe("Gauge target value"),
});

export const GlobalFiltersSchema = z.object({
  buildingId: z.string().nullable().describe("Building ID filter"),
  floor: z.number().int().nullable().describe("Floor number filter"),
  timeRange: z
    .enum(["today", "last7", "custom"])
    .nullable()
    .describe("Time range preset"),
  customStart: z.string().nullable().describe("Custom range start"),
  customEnd: z.string().nullable().describe("Custom range end"),
});

export const QueryResultSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  aggregated: z.number().nullable(),
});

// ── Request / Response Bodies ──────────────────────────────

export const QueryRequestBodySchema = z.object({
  config: CardConfigSchema,
  globalFilters: GlobalFiltersSchema,
});

export const OccupancyQueryParamsSchema = z.object({
  building_id: z.string().min(1),
  floor: z.coerce.number().int(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export const ErrorDetailResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

// ── Inferred Types ─────────────────────────────────────────

export type TableName = z.infer<typeof TableNameSchema>;
export type CardType = z.infer<typeof CardTypeSchema>;
export type AggregationType = z.infer<typeof AggregationTypeSchema>;
export type AxisConfig = z.infer<typeof AxisConfigSchema>;
export type FilterConfig = z.infer<typeof FilterConfigSchema>;
export type CardConfig = z.infer<typeof CardConfigSchema>;
export type GlobalFilters = z.infer<typeof GlobalFiltersSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type QueryRequestBody = z.infer<typeof QueryRequestBodySchema>;
