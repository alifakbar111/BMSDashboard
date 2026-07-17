import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildQuery } from "@/lib/query-builder";
import { aggregate } from "@/lib/aggregation";
import { QueryRequestBodySchema } from "@/lib/schemas";
import type { AggregationType } from "@/lib/schemas";

const prismaModels = {
  energyConsumption: prisma.energyConsumption,
  hvacPerformance: prisma.hvacPerformance,
  occupancy: prisma.occupancy,
  alertsEvent: prisma.alertsEvent,
} as const;

type PrismaModelName = keyof typeof prismaModels;

function getNumericValue(row: Record<string, unknown>, field: string): number {
  const val = row[field];
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** Round all numeric values in a row to 2 decimal places to avoid floating-point noise (e.g. 576.0000000000001 → 576). */
function roundRowNumbers<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const v = row[key];
    if (typeof v === "number" && !Number.isInteger(v)) {
      out[key] = Math.round(v * 100) / 100;
    } else {
      out[key] = v;
    }
  }
  return out as T;
}

export function processQueryResult(
  rows: Record<string, unknown>[],
  aggregationType: AggregationType,
  yField: string,
): { data: Record<string, unknown>[]; aggregated: number } {
  if (rows.length === 0) return { data: [], aggregated: 0 };
  const values = rows.map((row) => getNumericValue(row, yField));
  const aggregated = Math.round(aggregate(values, aggregationType) * 100) / 100;
  return { data: rows.map(roundRowNumbers), aggregated };
}

export async function POST(request: NextRequest) {
  // CSRF check
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    process.env.APP_URL,
  ].filter(Boolean);
  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Body size limit
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const parsed = QueryRequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { config: cardConfig, globalFilters } = parsed.data;
    const query = buildQuery(cardConfig, globalFilters);
    const model = prismaModels[query.modelName as PrismaModelName];
    if (!model) {
      return NextResponse.json({ error: `Unknown model: ${query.modelName}` }, { status: 500 });
    }

    let rows: Record<string, unknown>[];
    if (query.groupBy.length > 0 && query.mappedYField) {
      const aggregationMap: Record<string, string> = {
        sum: "_sum",
        avg: "_avg",
        min: "_min",
        max: "_max",
        count: "_count",
      };
      const aggField = aggregationMap[cardConfig.aggregation];
      const rawRows = await (model as any).groupBy({
        by: query.groupBy,
        where: query.where,
        [aggField]: { [query.mappedYField]: true },
        orderBy: Object.keys(query.orderBy).length > 0 ? query.orderBy : undefined,
      }) as Record<string, unknown>[];
      // Flatten Prisma's nested aggregation result (e.g. { _sum: { energyKwh: 83.3 }, deviceType: "HVAC" })
      // into a flat row { deviceType: "HVAC", energyKwh: 83.3 } so chart components can read the value directly.
      rows = rawRows.map((row) => {
        const flat: Record<string, unknown> = {};
        const aggContainer = row[aggField] as Record<string, unknown> | undefined;
        if (aggContainer && query.mappedYField) {
          flat[query.mappedYField] = aggContainer[query.mappedYField] ?? 0;
        }
        for (const key of Object.keys(row)) {
          if (key !== aggField) flat[key] = row[key];
        }
        return roundRowNumbers(flat);
      });
    } else {
      rows = await (model as any).findMany({
        where: query.where,
        select: Object.keys(query.select).length > 0 ? query.select : undefined,
        orderBy: Object.keys(query.orderBy).length > 0 ? query.orderBy : undefined,
      }) as unknown as Record<string, unknown>[];
    }

    if (cardConfig.type === "kpi" || cardConfig.type === "gauge") {
      // Use the already-mapped camelCase field name from buildQuery
      const yField = query.mappedYField ?? "";
      const result = processQueryResult(rows, cardConfig.aggregation, yField);
      return NextResponse.json(result);
    }

    return NextResponse.json({ data: rows, aggregated: null });
  } catch (e) {
    console.error("Query API error:", e);
    return NextResponse.json(
      { error: "Failed to execute query" },
      { status: 500 },
    );
  }
}
