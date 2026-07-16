import { NextRequest, NextResponse } from "next/server";

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_numeric: boolean;
}

const TABLE_COLUMNS: Record<string, ColumnInfo[]> = {
  energy_consumption: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "device_type", data_type: "string", is_numeric: false },
    { column_name: "device_id", data_type: "string", is_numeric: false },
    { column_name: "energy_kwh", data_type: "float", is_numeric: true },
    { column_name: "power_kw", data_type: "float", is_numeric: true },
    { column_name: "voltage_v", data_type: "float", is_numeric: true },
    { column_name: "current_a", data_type: "float", is_numeric: true },
    { column_name: "power_factor", data_type: "float", is_numeric: true },
    { column_name: "cost_usd", data_type: "float", is_numeric: true },
    { column_name: "source_system", data_type: "string", is_numeric: false },
  ],
  hvac_performance: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "unit_id", data_type: "string", is_numeric: false },
    { column_name: "mode", data_type: "string", is_numeric: false },
    { column_name: "setpoint_temp_c", data_type: "float", is_numeric: true },
    { column_name: "actual_temp_c", data_type: "float", is_numeric: true },
    { column_name: "outdoor_temp_c", data_type: "float", is_numeric: true },
    { column_name: "humidity_percent", data_type: "float", is_numeric: true },
    { column_name: "airflow_m3h", data_type: "float", is_numeric: true },
    { column_name: "filter_status_percent", data_type: "float", is_numeric: true },
    { column_name: "compressor_hours", data_type: "float", is_numeric: true },
    { column_name: "energy_efficiency_ratio", data_type: "float", is_numeric: true },
    { column_name: "operating_status", data_type: "string", is_numeric: false },
  ],
  occupancy: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "zone_capacity", data_type: "integer", is_numeric: true },
    { column_name: "person_count", data_type: "integer", is_numeric: true },
    { column_name: "occupancy_rate_percent", data_type: "float", is_numeric: true },
    { column_name: "co2_ppm", data_type: "integer", is_numeric: true },
    { column_name: "temperature_c", data_type: "float", is_numeric: true },
    { column_name: "humidity_percent", data_type: "float", is_numeric: true },
    { column_name: "air_quality_index", data_type: "integer", is_numeric: true },
    { column_name: "entry_count", data_type: "integer", is_numeric: true },
    { column_name: "exit_count", data_type: "integer", is_numeric: true },
  ],
  alerts_events: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "alert_id", data_type: "string", is_numeric: false },
    { column_name: "severity", data_type: "string", is_numeric: false },
    { column_name: "category", data_type: "string", is_numeric: false },
    { column_name: "device_id", data_type: "string", is_numeric: false },
    { column_name: "alarm_type", data_type: "string", is_numeric: false },
    { column_name: "description", data_type: "string", is_numeric: false },
    { column_name: "value", data_type: "float", is_numeric: true },
    { column_name: "threshold", data_type: "float", is_numeric: true },
    { column_name: "unit", data_type: "string", is_numeric: false },
    { column_name: "duration_minutes", data_type: "integer", is_numeric: true },
    { column_name: "resolved_at", data_type: "datetime", is_numeric: false },
    { column_name: "status", data_type: "string", is_numeric: false },
    { column_name: "acknowledged_by", data_type: "string", is_numeric: false },
  ],
};

export function getTableColumns(tableName: string): ColumnInfo[] {
  const columns = TABLE_COLUMNS[tableName];
  if (!columns) throw new Error(`Unknown data source: ${tableName}`);
  return columns;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "Missing 'source' query parameter" }, { status: 400 });
  }
  try {
    const columns = getTableColumns(source);
    return NextResponse.json({ columns });
  } catch {
    return NextResponse.json({ error: `Unknown data source: ${source}` }, { status: 404 });
  }
}
