import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildQuery } from "@/lib/query-builder";
import { aggregate } from "@/lib/aggregation";
import { QueryRequestBodySchema, CardConfigSchema } from "@/lib/schemas";
import type { AggregationType } from "@/lib/types";

function getNumericValue(row: Record<string, unknown>, field: string): number {
  const val = row[field];
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function processQueryResult(
  rows: Record<string, unknown>[],
  aggregationType: AggregationType,
  yField: string,
): { data: Record<string, unknown>[]; aggregated: number } {
  if (rows.length === 0) return { data: [], aggregated: 0 };
  const values = rows.map((row) => getNumericValue(row, yField));
  const aggregated = aggregate(values, aggregationType);
  return { data: rows, aggregated };
}

export async function POST(request: NextRequest) {
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
    const model = (prisma as any)[query.modelName];
    if (!model) {
      return NextResponse.json({ error: `Unknown model: ${query.modelName}` }, { status: 500 });
    }

    const rows = await model.findMany({
      where: query.where,
      select: Object.keys(query.select).length > 0 ? query.select : undefined,
      orderBy: Object.keys(query.orderBy).length > 0 ? query.orderBy : undefined,
    });

    const rawData = rows as unknown as Record<string, unknown>[];

    if (cardConfig.type === "kpi" || cardConfig.type === "gauge") {
      // Use the already-mapped camelCase field name from buildQuery
      const yField = query.mappedYField ?? "";
      const result = processQueryResult(rawData, cardConfig.aggregation, yField);
      return NextResponse.json(result);
    }

    return NextResponse.json({ data: rawData, aggregated: null });
  } catch (e) {
    console.error("Query API error:", e);
    return NextResponse.json(
      { error: "Failed to execute query", details: (e as Error).message },
      { status: 500 },
    );
  }
}
