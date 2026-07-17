import type { CardConfig, GlobalFilters, FilterConfig, TableName } from "./schemas";

function parseOperatorToPrisma(operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"): string {
  const map: Record<string, string> = {
    eq: "equals",
    neq: "not",
    gt: "gt",
    gte: "gte",
    lt: "lt",
    lte: "lte",
  };
  return map[operator] || "equals";
}

/** Internal type that accepts a mapped filter where field has been transformed to camelCase. */
type MappedFilter = Omit<FilterConfig, "field"> & { field: string };

export function buildWhereClause(
  filters: GlobalFilters,
  cardFilter?: FilterConfig | MappedFilter,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.buildingId) {
    where.buildingId = filters.buildingId;
  }
  if (filters.floor !== null && filters.floor !== undefined) {
    where.floor = filters.floor;
  }
  if (filters.timeRange === "today") {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    where.timestamp = { gte: startOfDay };
  } else if (filters.timeRange === "last7") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.timestamp = { gte: sevenDaysAgo };
  } else if (filters.timeRange === "custom") {
    // Apply whichever bound(s) the user has picked so a partially-filled
    // custom range still takes effect (instead of being silently ignored).
    const range: { gte?: Date; lte?: Date } = {};
    if (filters.customStart) range.gte = new Date(filters.customStart);
    if (filters.customEnd) range.lte = new Date(filters.customEnd);
    if (range.gte || range.lte) where.timestamp = range;
  }
  if (cardFilter) {
    if (cardFilter.value === "" || cardFilter.value === undefined || cardFilter.value === null) {
      // skip empty/null/undefined filter values — they are semantically "no filter"
    } else if (cardFilter.operator === "eq") {
      where[cardFilter.field] = cardFilter.value;
    } else {
      const prismaOp = parseOperatorToPrisma(cardFilter.operator);
      where[cardFilter.field] = { [prismaOp]: cardFilter.value };
    }
  }
  return where;
}

/** Map a snake_case column name to its camelCase Prisma field name. */
export function mapFieldName(field: string, table: TableName): string {
  const fieldMappings: Record<TableName, Record<string, string>> = {
    energy_consumption: {
      timestamp: "timestamp",
      building_id: "buildingId",
      floor: "floor",
      zone: "zone",
      device_type: "deviceType",
      device_id: "deviceId",
      energy_kwh: "energyKwh",
      power_kw: "powerKw",
      voltage_v: "voltageV",
      current_a: "currentA",
      power_factor: "powerFactor",
      cost_usd: "costUsd",
      source_system: "sourceSystem",
    },
    hvac_performance: {
      timestamp: "timestamp",
      building_id: "buildingId",
      floor: "floor",
      zone: "zone",
      unit_id: "unitId",
      setpoint_temp_c: "setpointTempC",
      actual_temp_c: "actualTempC",
      outdoor_temp_c: "outdoorTempC",
      humidity_percent: "humidityPercent",
      airflow_m3h: "airflowM3h",
      filter_status_percent: "filterStatusPercent",
      compressor_hours: "compressorHours",
      energy_efficiency_ratio: "energyEfficiencyRatio",
      operating_status: "operatingStatus",
    },
    occupancy: {
      building_id: "buildingId",
      zone_capacity: "zoneCapacity",
      person_count: "personCount",
      occupancy_rate_percent: "occupancyRatePercent",
      co2_ppm: "co2Ppm",
      temperature_c: "temperatureC",
      humidity_percent: "humidityPercent",
      air_quality_index: "airQualityIndex",
      entry_count: "entryCount",
      exit_count: "exitCount",
    },
    alerts_events: {
      building_id: "buildingId",
      alert_id: "alertId",
      device_id: "deviceId",
      alarm_type: "alarmType",
      duration_minutes: "durationMinutes",
      resolved_at: "resolvedAt",
      acknowledged_by: "acknowledgedBy",
    },
  };
  const mapped = fieldMappings[table]?.[field];
  if (!mapped) {
    throw new Error(`Unknown field '${field}' for table '${table}'`);
  }
  return mapped;
}

function getPrismaModel(table: TableName): string {
  const map: Record<TableName, string> = {
    energy_consumption: "energyConsumption",
    hvac_performance: "hvacPerformance",
    occupancy: "occupancy",
    alerts_events: "alertsEvent",
  };
  return map[table];
}

export function buildQuery(
  config: CardConfig,
  globalFilters: GlobalFilters,
): {
  table: TableName;
  modelName: string;
  where: Record<string, unknown>;
  groupBy: string[];
  select: Record<string, boolean>;
  orderBy: Record<string, string>;
  /** Mapped camelCase version of yAxis field for route handlers. */
  mappedYField: string | null;
  /** Mapped camelCase version of xAxis field for route handlers. */
  mappedXField: string | null;
} {
  const table = config.dataSource!;
  const modelName = getPrismaModel(table);

  // Map card filter field names to camelCase for Prisma compatibility
  const mappedFilter = config.filter
    ? { ...config.filter, field: mapFieldName(config.filter.field, table) }
    : undefined;
  const where = buildWhereClause(globalFilters, mappedFilter);

  const groupBy: string[] = [];
  const select: Record<string, boolean> = {};
  const orderBy: Record<string, string> = {};

  const yField = config.yAxis ? mapFieldName(config.yAxis.field, table) : null;
  const xField = config.xAxis ? mapFieldName(config.xAxis.field, table) : null;
  const groupField = config.groupBy ? mapFieldName(config.groupBy.field, table) : null;

  if (config.type === "kpi" && yField) {
    select[yField] = true;
  }
  if (config.type === "bar" && xField && yField) {
    groupBy.push(xField);
    select[xField] = true;
    select[yField] = true;
  }
  if (config.type === "line" && xField && yField) {
    orderBy[xField] = "asc";
    select[xField] = true;
    select[yField] = true;
    if (groupField) {
      groupBy.push(xField);
      groupBy.push(groupField);
      select[groupField] = true;
    }
  }
  if (config.type === "gauge" && yField) {
    select[yField] = true;
  }

  return { table, modelName, where, groupBy, select, orderBy, mappedYField: yField, mappedXField: xField };
}
