import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../src/generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

// Parse DATABASE_URL for adapter config
// URL format: sqlserver://host:port;database=db;user=user;password=pwd;trustServerCertificate=true
const connectionUrl = process.env.DATABASE_URL || "sqlserver://localhost:1433;database=bms_dashboard;user=SA;password=Y0uRStrOng!P4ssw0rd;trustServerCertificate=true";
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
  password: getParam(connectionUrl, "password") || "Y0uRStrOng!P4ssw0rd",
  options: {
    encrypt: getParam(connectionUrl, "encrypt") === "true",
    trustServerCertificate: getParam(connectionUrl, "trustServerCertificate") !== "false",
  },
};
const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

const DATA_DIR = path.resolve(process.cwd(), "data");

/** Simple CSV parser. Returns an array of objects keyed by header names. */
function parseCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8").trim();

  if (!content) {
    console.warn(`  ⚠  ${filename} is empty – skipping`);
    return [];
  }

  const lines = content.split("\n");
  if (lines.length < 2) {
    console.warn(`  ⚠  ${filename} has no data rows – skipping`);
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function nullableString(val: string): string | null {
  return val === "" ? null : val;
}

function nullableDate(val: string): Date | null {
  return val === "" ? null : new Date(val);
}

// ---------------------------------------------------------------------------
// Seed: EnergyConsumption
// ---------------------------------------------------------------------------
async function seedEnergyConsumption(): Promise<number> {
  const raw = parseCsv("energy_consumption.csv");
  console.log(`  Parsed ${raw.length} rows from energy_consumption.csv`);

  for (const r of raw) {
    await prisma.energyConsumption.create({
      data: {
        timestamp: new Date(r.timestamp),
        buildingId: r.building_id,
        floor: parseInt(r.floor, 10),
        zone: r.zone,
        deviceType: r.device_type,
        deviceId: r.device_id,
        energyKwh: parseFloat(r.energy_kwh),
        powerKw: parseFloat(r.power_kw),
        voltageV: parseFloat(r.voltage_v),
        currentA: parseFloat(r.current_a),
        powerFactor: parseFloat(r.power_factor),
        costUsd: parseFloat(r.cost_usd),
        sourceSystem: r.source_system,
      },
    });
  }

  console.log(`  ✅ Inserted ${raw.length} EnergyConsumption rows`);
  return raw.length;
}

// ---------------------------------------------------------------------------
// Seed: HvacPerformance
// ---------------------------------------------------------------------------
async function seedHvacPerformance(): Promise<number> {
  const raw = parseCsv("hvac_performance.csv");
  console.log(`  Parsed ${raw.length} rows from hvac_performance.csv`);

  for (const r of raw) {
    await prisma.hvacPerformance.create({
      data: {
        timestamp: new Date(r.timestamp),
        buildingId: r.building_id,
        floor: parseInt(r.floor, 10),
        zone: r.zone,
        unitId: r.unit_id,
        mode: r.mode,
        setpointTempC: parseFloat(r.setpoint_temp_c),
        actualTempC: parseFloat(r.actual_temp_c),
        outdoorTempC: parseFloat(r.outdoor_temp_c),
        humidityPercent: parseFloat(r.humidity_percent),
        airflowM3h: parseFloat(r.airflow_m3h),
        filterStatusPercent: parseFloat(r.filter_status_percent),
        compressorHours: parseFloat(r.compressor_hours),
        energyEfficiencyRatio: parseFloat(r.energy_efficiency_ratio),
        operatingStatus: r.operating_status,
      },
    });
  }

  console.log(`  ✅ Inserted ${raw.length} HvacPerformance rows`);
  return raw.length;
}

// ---------------------------------------------------------------------------
// Seed: Occupancy
// ---------------------------------------------------------------------------
async function seedOccupancy(): Promise<number> {
  const raw = parseCsv("occupancy.csv");
  console.log(`  Parsed ${raw.length} rows from occupancy.csv`);

  for (const r of raw) {
    await prisma.occupancy.create({
      data: {
        timestamp: new Date(r.timestamp),
        buildingId: r.building_id,
        floor: parseInt(r.floor, 10),
        zone: r.zone,
        zoneCapacity: parseInt(r.zone_capacity, 10),
        personCount: parseInt(r.person_count, 10),
        occupancyRatePercent: parseFloat(r.occupancy_rate_percent),
        co2Ppm: parseInt(r.co2_ppm, 10),
        temperatureC: parseFloat(r.temperature_c),
        humidityPercent: parseFloat(r.humidity_percent),
        airQualityIndex: parseInt(r.air_quality_index, 10),
        entryCount: parseInt(r.entry_count, 10),
        exitCount: parseInt(r.exit_count, 10),
      },
    });
  }

  console.log(`  ✅ Inserted ${raw.length} Occupancy rows`);
  return raw.length;
}

// ---------------------------------------------------------------------------
// Seed: AlertsEvent
// ---------------------------------------------------------------------------
async function seedAlertsEvent(): Promise<number> {
  const raw = parseCsv("alerts_events.csv");
  console.log(`  Parsed ${raw.length} rows from alerts_events.csv`);

  for (const r of raw) {
    await prisma.alertsEvent.create({
      data: {
        timestamp: new Date(r.timestamp),
        buildingId: r.building_id,
        floor: parseInt(r.floor, 10),
        zone: r.zone,
        alertId: r.alert_id,
        severity: r.severity,
        category: r.category,
        deviceId: nullableString(r.device_id),
        alarmType: r.alarm_type,
        description: r.description,
        value: parseFloat(r.value),
        threshold: parseFloat(r.threshold),
        unit: r.unit,
        durationMinutes: parseInt(r.duration_minutes, 10),
        resolvedAt: nullableDate(r.resolved_at),
        status: r.status,
        acknowledgedBy: nullableString(r.acknowledged_by),
      },
    });
  }

  console.log(`  ✅ Inserted ${raw.length} AlertsEvent rows`);
  return raw.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Seeding database…\n");

  const counts: Record<string, number> = {};

  counts.EnergyConsumption = await seedEnergyConsumption();
  counts.HvacPerformance = await seedHvacPerformance();
  counts.Occupancy = await seedOccupancy();
  counts.AlertsEvent = await seedAlertsEvent();

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
