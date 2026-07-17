import "dotenv/config";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseConnectionUrl } from "../src/lib/db-config";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

// ---------------------------------------------------------------------------
// Connection setup
// ---------------------------------------------------------------------------
const connectionUrl = process.env.DATABASE_URL;
if (!connectionUrl) {
  console.error("❌ FATAL: DATABASE_URL environment variable is required");
  console.error("   Copy .env.example to .env and set a strong SA_PASSWORD");
  process.exit(1);
}

const config = parseConnectionUrl(connectionUrl);
const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

const DATA_DIR = path.resolve(process.cwd(), "data");

// ---------------------------------------------------------------------------
// Safe number helpers
// ---------------------------------------------------------------------------
export function safeInt(val: string, fallback = 0): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

export function safeFloat(val: string, fallback = 0): number {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

export function nullableString(val: string): string | null {
  return val === "" ? null : val;
}

export function nullableDate(val: string): Date | null {
  if (val === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Timestamp shift
//
// The CSVs in `data/` are static snapshots whose latest rows are far in the
// past (e.g. 2025-06-01). The floor-plan UI treats any data older than one
// hour as "stale" (grey NO DATA badge), so the seeded timestamps are shifted
// so the latest row in the reference table lands on "now". All other rows
// shift by the same offset, preserving the relative time distribution.
//
// `TIME_OFFSET_MS` is computed once in `main()` and reused by every mapper so
// that all four tables stay in sync (cross-table queries assume the same
// timeline).
// ---------------------------------------------------------------------------
let TIME_OFFSET_MS = 0;

function computeTimeOffset(): number {
  const referenceRows = parseCsv<Record<string, string>>("occupancy.csv");
  if (referenceRows.length === 0) return 0;
  const maxTimestamp = referenceRows.reduce((max, r) => {
    const t = new Date(r.timestamp).getTime();
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);
  if (!Number.isFinite(maxTimestamp) || maxTimestamp === 0) return 0;
  return Date.now() - maxTimestamp;
}

function shiftDate(val: string): Date {
  const t = new Date(val).getTime();
  if (!Number.isFinite(t)) return new Date(NaN);
  return new Date(t + TIME_OFFSET_MS);
}

function shiftNullableDate(val: string): Date | null {
  if (val === "") return null;
  const t = new Date(val).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + TIME_OFFSET_MS);
}

// ---------------------------------------------------------------------------
// Generic CSV parser (RFC 4180 via csv-parse)
// ---------------------------------------------------------------------------
function parseCsv<T extends Record<string, string>>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8").trim();

  if (!content) {
    console.warn(`  ⚠  ${filename} is empty – skipping`);
    return [];
  }

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as T[];
}

// ---------------------------------------------------------------------------
// Generic seed function (DRY)
// ---------------------------------------------------------------------------
async function seedTable<T extends Record<string, unknown>>(
  modelName: string,
  filename: string,
  mapper: (row: Record<string, string>) => T,
): Promise<number> {
  const raw = parseCsv(filename);
  if (raw.length === 0) {
    console.log(`  ⚠  No data to seed for ${modelName}`);
    return 0;
  }
  console.log(`  Parsed ${raw.length} rows from ${filename}`);

  const data = raw.map(mapper);

  await prisma.$transaction(
    data.map((row) =>
      (prisma as any)[modelName].create({ data: row }),
    ),
  );

  console.log(`  ✅ Inserted ${data.length} ${modelName} rows`);
  return data.length;
}

// ---------------------------------------------------------------------------
// Row mappers
//
// Every mapper applies `TIME_OFFSET_MS` (set in `main()`) to its timestamp
// column. `mapAlertsEvent` also shifts `resolvedAt` so alert lifecycle data
// stays consistent with the rest of the timeline.
// ---------------------------------------------------------------------------
export function mapEnergyConsumption(r: Record<string, string>) {
  return {
    timestamp: shiftDate(r.timestamp),
    buildingId: r.building_id,
    floor: safeInt(r.floor),
    zone: r.zone,
    deviceType: r.device_type,
    deviceId: r.device_id,
    energyKwh: safeFloat(r.energy_kwh),
    powerKw: safeFloat(r.power_kw),
    voltageV: safeFloat(r.voltage_v),
    currentA: safeFloat(r.current_a),
    powerFactor: safeFloat(r.power_factor),
    costUsd: safeFloat(r.cost_usd),
    sourceSystem: r.source_system,
  };
}

function mapHvacPerformance(r: Record<string, string>) {
  return {
    timestamp: shiftDate(r.timestamp),
    buildingId: r.building_id,
    floor: safeInt(r.floor),
    zone: r.zone,
    unitId: r.unit_id,
    mode: r.mode,
    setpointTempC: safeFloat(r.setpoint_temp_c),
    actualTempC: safeFloat(r.actual_temp_c),
    outdoorTempC: safeFloat(r.outdoor_temp_c),
    humidityPercent: safeFloat(r.humidity_percent),
    airflowM3h: safeFloat(r.airflow_m3h),
    filterStatusPercent: safeFloat(r.filter_status_percent),
    compressorHours: safeFloat(r.compressor_hours),
    energyEfficiencyRatio: safeFloat(r.energy_efficiency_ratio),
    operatingStatus: r.operating_status,
  };
}

function mapOccupancy(r: Record<string, string>) {
  return {
    timestamp: shiftDate(r.timestamp),
    buildingId: r.building_id,
    floor: safeInt(r.floor),
    zone: r.zone,
    zoneCapacity: safeInt(r.zone_capacity),
    personCount: safeInt(r.person_count),
    occupancyRatePercent: safeFloat(r.occupancy_rate_percent),
    co2Ppm: safeInt(r.co2_ppm),
    temperatureC: safeFloat(r.temperature_c),
    humidityPercent: safeFloat(r.humidity_percent),
    airQualityIndex: safeInt(r.air_quality_index),
    entryCount: safeInt(r.entry_count),
    exitCount: safeInt(r.exit_count),
  };
}

function mapAlertsEvent(r: Record<string, string>) {
  return {
    timestamp: shiftDate(r.timestamp),
    buildingId: r.building_id,
    floor: safeInt(r.floor),
    zone: r.zone,
    alertId: r.alert_id,
    severity: r.severity,
    category: r.category,
    deviceId: nullableString(r.device_id),
    alarmType: r.alarm_type,
    description: r.description,
    value: safeFloat(r.value),
    threshold: safeFloat(r.threshold),
    unit: r.unit,
    durationMinutes: safeInt(r.duration_minutes),
    resolvedAt: shiftNullableDate(r.resolved_at),
    status: r.status,
    acknowledgedBy: nullableString(r.acknowledged_by),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Seeding database…\n");

  // Anchor the latest row in the reference table (occupancy) to "now" so
  // downstream UIs see fresh data. Every other table is shifted by the
  // same offset to keep cross-table joins consistent.
  TIME_OFFSET_MS = computeTimeOffset();
  const offsetHours = (TIME_OFFSET_MS / 3_600_000).toFixed(2);
  console.log(`  ⏱  Shifting timestamps by ${offsetHours}h to anchor latest row to now\n`);

  const counts: Record<string, number> = {};

  counts.EnergyConsumption = await seedTable("energyConsumption", "energy_consumption.csv", mapEnergyConsumption);
  counts.HvacPerformance = await seedTable("hvacPerformance", "hvac_performance.csv", mapHvacPerformance);
  counts.Occupancy = await seedTable("occupancy", "occupancy.csv", mapOccupancy);
  counts.AlertsEvent = await seedTable("alertsEvent", "alerts_events.csv", mapAlertsEvent);

  console.log("\n📋 Seed summary:");
  for (const [model, count] of Object.entries(counts)) {
    console.log(`  ${model}: ${count} rows`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\n🎉 Total: ${total} rows inserted across 4 tables`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
