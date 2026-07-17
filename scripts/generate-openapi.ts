/**
 * generate-openapi.ts — Reads Zod schemas from src/lib/schemas.ts,
 * converts them to JSON Schema, and writes the full OpenAPI 3.0
 * spec to docs/openapi/spec.json.
 *
 * Usage: pnpm gen:openapi
 */

import * as fs from "fs";
import * as path from "path";
import {
  CardConfigSchema,
  GlobalFiltersSchema,
  QueryResultSchema,
  ErrorResponseSchema,
  ErrorDetailResponseSchema,
} from "../src/lib/schemas";

/** Convert a Zod schema to a plain JSON Schema object (strips $schema). */
function toSchema<T>(schema: { toJSONSchema(): T }): T {
  const raw = schema.toJSONSchema() as Record<string, unknown>;
  const rest = raw;
  return rest as T;
}

// ── Schema Definitions ─────────────────────────────────────

const schemas: Record<string, object> = {
  ColumnInfo: {
    type: "object",
    description: "Metadata about a single column in a data source",
    properties: {
      column_name: { type: "string", description: "Column name in snake_case" },
      data_type: { type: "string", description: "Semantic data type (string, float, integer, datetime)" },
      is_numeric: { type: "boolean", description: "Whether the column contains numeric values" },
    },
    required: ["column_name", "data_type", "is_numeric"],
  },
  CardConfig: toSchema(CardConfigSchema),
  AxisConfig: {
    type: "object",
    description: "Axis field configuration",
    properties: {
      field: { type: "string" },
      label: { type: "string" },
    },
    required: ["field", "label"],
  },
  FilterConfig: {
    type: "object",
    description: "Card-level filter",
    properties: {
      field: { type: "string" },
      operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte"] },
      value: { oneOf: [{ type: "string" }, { type: "number" }] },
    },
    required: ["field", "operator", "value"],
  },
  GlobalFilters: toSchema(GlobalFiltersSchema),
  QueryResult: toSchema(QueryResultSchema),
  ErrorResponse: toSchema(ErrorResponseSchema),
  ErrorDetailResponse: toSchema(ErrorDetailResponseSchema),
};

// ── Paths ──────────────────────────────────────────────────

const spec = {
  openapi: "3.0.3",
  info: {
    title: "BMS Dashboard API",
    version: "1.0.0",
    description:
      "REST API for the Building Management System Dashboard — provides column metadata, dynamic data queries with aggregation, and real-time occupancy data for floor plan visualization.",
  },
  servers: [{ url: "http://localhost:3000", description: "Local development" }],
  paths: {
    "/api/columns": {
      get: {
        summary: "Get column metadata for a data source",
        description:
          "Returns all columns (name, type, numeric flag) for a given BMS data source. Used by the frontend to populate axis selection dropdowns.",
        parameters: [
          {
            name: "source",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["energy_consumption", "hvac_performance", "occupancy", "alerts_events"],
            },
            description: "The data source table name",
            example: "energy_consumption",
          },
        ],
        responses: {
          "200": {
            description: "Column metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    columns: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ColumnInfo" },
                    },
                  },
                },
                example: {
                  columns: [
                    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
                    { column_name: "energy_kwh", data_type: "float", is_numeric: true },
                    { column_name: "zone", data_type: "string", is_numeric: false },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Missing source parameter",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Missing 'source' query parameter" },
              },
            },
          },
          "404": {
            description: "Unknown data source",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Unknown data source: invalid_source" },
              },
            },
          },
        },
      },
    },
    "/api/query": {
      post: {
        summary: "Execute a dynamic card data query",
        description:
          "Accepts a card configuration and global filter state, constructs a Prisma query, executes it, and returns aggregated values (for KPI/Gauge cards) or raw data (for Bar/Line cards).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["config", "globalFilters"],
                properties: {
                  config: { $ref: "#/components/schemas/CardConfig" },
                  globalFilters: { $ref: "#/components/schemas/GlobalFilters" },
                },
              },
              example: {
                config: {
                  id: "card-1",
                  type: "bar",
                  title: "Energy by Zone",
                  dataSource: "energy_consumption",
                  xAxis: { field: "zone", label: "Zone" },
                  yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
                  aggregation: "sum",
                  groupBy: null,
                  filter: null,
                },
                globalFilters: {
                  buildingId: null,
                  floor: null,
                  timeRange: null,
                  customStart: null,
                  customEnd: null,
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Query results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QueryResult" },
                examples: {
                  aggregated: {
                    summary: "KPI/Gauge result",
                    value: { data: [{ energyKwh: 150 }], aggregated: 150 },
                  },
                  raw: {
                    summary: "Bar/Line result",
                    value: {
                      data: [
                        { zone: "Zone-A", energyKwh: 150 },
                        { zone: "Zone-B", energyKwh: 220 },
                      ],
                      aggregated: null,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Query execution error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorDetailResponse" },
              },
            },
          },
        },
      },
    },
    "/api/occupancy/latest": {
      get: {
        summary: "Get latest occupancy readings per zone",
        description:
          "Returns the most recent occupancy data for each zone in a building floor. Used by the floor plan SVG overlay to color-code zones.",
        parameters: [
          {
            name: "building_id",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Building identifier",
            example: "BLD-001",
          },
          {
            name: "floor",
            in: "query",
            required: true,
            schema: { type: "integer" },
            description: "Floor number",
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Latest occupancy per zone",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    buildingId: { type: "string" },
                    floor: { type: "integer" },
                    zones: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          zone: { type: "string" },
                          zoneCapacity: { type: "integer" },
                          personCount: { type: "integer" },
                          occupancyRatePercent: { type: "number" },
                          co2Ppm: { type: "integer" },
                          temperatureC: { type: "number" },
                          humidityPercent: { type: "number" },
                          airQualityIndex: { type: "integer" },
                          entryCount: { type: "integer" },
                          exitCount: { type: "integer" },
                          timestamp: { type: "string", format: "date-time" },
                        },
                      },
                    },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
                example: {
                  buildingId: "BLD-001",
                  floor: 1,
                  zones: [
                    {
                      zone: "Zone-A",
                      zoneCapacity: 150,
                      personCount: 120,
                      occupancyRatePercent: 80,
                      co2Ppm: 420,
                      temperatureC: 22.5,
                      humidityPercent: 45,
                      airQualityIndex: 85,
                      entryCount: 45,
                      exitCount: 30,
                      timestamp: "2025-06-01T09:00:00.000Z",
                    },
                  ],
                  timestamp: "2025-06-01T09:05:00.000Z",
                },
              },
            },
          },
          "400": {
            description: "Missing or invalid parameters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to fetch occupancy data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas,
  },
};

// ── Write ──────────────────────────────────────────────────

const outPath = path.resolve(__dirname, "../docs/openapi/spec.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2) + "\n");
console.log(`✅ Wrote OpenAPI spec to ${outPath}`);
