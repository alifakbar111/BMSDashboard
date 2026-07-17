// src/lib/default-dashboard.ts
/**
 * Default dashboard layout used for SSR prefetching.
 *
 * The server cannot read the user's localStorage, so it prefetches a
 * known set of cards. After hydration, the client StoreInitializer
 * replaces this with the user's saved layout (if any). The defaults
 * therefore only "win" for first-time visitors, which is the case
 * we care about (no skeleton flash on first load).
 */
import type { CardConfig, DashboardCard } from "@/lib/schemas";

/** Default global filters used during SSR prefetch. Matches the
 *  store's DEFAULT_FILTERS — i.e. no filter applied. */
export const DEFAULT_FILTERS = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
} as const;

const KPI: CardConfig = {
  id: "default-kpi-1",
  type: "kpi",
  title: "Total Energy (kWh)",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

const BAR: CardConfig = {
  id: "default-bar-1",
  type: "bar",
  title: "Alerts by Severity",
  dataSource: "alerts_events",
  xAxis: { field: "severity", label: "Severity" },
  yAxis: { field: "value", label: "Value" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

const LINE: CardConfig = {
  id: "default-line-1",
  type: "line",
  title: "Energy Trend by Device",
  dataSource: "energy_consumption",
  xAxis: { field: "timestamp", label: "Timestamp" },
  yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
  aggregation: "sum",
  groupBy: { field: "device_id", label: "Device ID" },
  filter: null,
};

const GAUGE: CardConfig = {
  id: "default-gauge-1",
  type: "gauge",
  title: "Avg Power Factor",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "power_factor", label: "Power Factor" },
  aggregation: "avg",
  groupBy: null,
  filter: null,
  gaugeMin: 0,
  gaugeMax: 1,
  gaugeTarget: 0.9,
};

export const DEFAULT_DASHBOARD_CARDS: DashboardCard[] = [
  { id: KPI.id, config: KPI, x: 0, y: 0, width: 1, height: 1 },
  { id: BAR.id, config: BAR, x: 1, y: 0, width: 1, height: 1 },
  { id: LINE.id, config: LINE, x: 0, y: 1, width: 2, height: 1 },
  { id: GAUGE.id, config: GAUGE, x: 0, y: 2, width: 1, height: 1 },
];
