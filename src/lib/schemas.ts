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

// ── Valid Fields ──────────────────────────────────────────

export const VALID_FIELDS = [
  // Energy Consumption
  "timestamp", "building_id", "floor", "zone", "device_type", "device_id",
  "energy_kwh", "power_kw", "voltage_v", "current_a", "power_factor",
  "cost_usd", "source_system",
  // HVAC Performance
  "unit_id", "mode", "setpoint_temp_c", "actual_temp_c", "outdoor_temp_c",
  "humidity_percent", "airflow_m3h", "filter_status_percent",
  "compressor_hours", "energy_efficiency_ratio", "operating_status",
  // Occupancy
  "zone_capacity", "person_count", "occupancy_rate_percent", "co2_ppm",
  "temperature_c", "air_quality_index", "entry_count", "exit_count",
  // Alerts Events
  "alert_id", "severity", "category", "alarm_type", "description",
  "value", "threshold", "unit", "duration_minutes", "resolved_at",
  "status", "acknowledged_by",
] as const;

// ── Composite Schemas ──────────────────────────────────────

export const AxisConfigSchema = z.object({
  field: z.enum(VALID_FIELDS).describe("Column name"),
  label: z.string().describe("Display label"),
});

export const FilterConfigSchema = z.object({
  field: z.enum(VALID_FIELDS).describe("Column to filter on"),
  operator: OperatorSchema,
  value: z.union([z.string().min(1), z.number()]).describe("Filter value"),
});

export const CardConfigSchema = z.object({
  id: z.string().describe("Unique card identifier"),
  type: CardTypeSchema,
  title: z.string().describe("Card display title"),
  dataSource: TableNameSchema.describe("Data source table name"),
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
  customStart: z.string().datetime().nullable().describe("Custom range start (ISO 8601)"),
  customEnd: z.string().datetime().nullable().describe("Custom range end (ISO 8601)"),
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

export interface DashboardCard {
  id: string;
  config: CardConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}
