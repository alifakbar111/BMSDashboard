export type TableName = "energy_consumption" | "hvac_performance" | "occupancy" | "alerts_events";
export type CardType = "kpi" | "bar" | "line" | "gauge";
export type AggregationType = "sum" | "avg" | "min" | "max" | "count";

export interface AxisConfig {
  field: string;
  label: string;
}

export interface FilterConfig {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
  value: string | number;
}

export interface CardConfig {
  id: string;
  type: CardType;
  title: string;
  dataSource: TableName | null;
  xAxis: AxisConfig | null;
  yAxis: AxisConfig | null;
  aggregation: AggregationType;
  groupBy: AxisConfig | null;
  filter: FilterConfig | null;
  gaugeMin?: number;
  gaugeMax?: number;
  gaugeTarget?: number;
}

export interface GlobalFilters {
  buildingId: string | null;
  floor: number | null;
  timeRange: "today" | "last7" | "custom" | null;
  customStart: string | null;
  customEnd: string | null;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  aggregated: number | null;
}

export interface DashboardCard {
  id: string;
  config: CardConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}
