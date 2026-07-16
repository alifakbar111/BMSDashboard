import "dotenv/config";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../src/generated/prisma/client";
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

const getParam = (url: string, key: string): string => {
  const match = url.match(new RegExp(`${key}=([^;]+)`));
  return match ? match[1] : "";
};
const serverMatch = connectionUrl.match(/sqlserver:\/\/([^:;]+)/);
const portMatch = connectionUrl.match(/:(\d+);/);

const config = {
  server: serverMatch?.[1] ?? "localhost",
  port: portMatch ? parseInt(portMatch[1], 10) : 1433,
  database: getParam(connectionUrl, "database") || "bms_dashboard",
  user: getParam(connectionUrl, "user") || "SA",
  password: getParam(connectionUrl, "password") || "",
  options: {
    encrypt: getParam(connectionUrl, "encrypt") === "true",
    trustServerCertificate: getParam(connectionUrl, "trustServerCertificate") !== "false",
  },
};
const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

const DATA_DIR = path.resolve(process.cwd(), "data");

// ---------------------------------------------------------------------------
// Safe number helpers
// ---------------------------------------------------------------------------
function safeInt(val: string, fallback = 0): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

function safeFloat(val: string, fallback = 0): number {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function nullableString(val: string): string | null {
  return val === "" ? null : val;
}

function nullableDate(val: string): Date | null {
  if (val === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
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
// ---------------------------------------------------------------------------
function mapEnergyConsumption(r: Record<string, string>) {
  return {
    timestamp: new Date(r.timestamp),
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
    timestamp: new Date(r.timestamp),
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
    timestamp: new Date(r.timestamp),
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
    timestamp: new Date(r.timestamp),
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
    resolvedAt: nullableDate(r.resolved_at),
    status: r.status,
    acknowledgedBy: nullableString(r.acknowledged_by),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Seeding database…\n");

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
