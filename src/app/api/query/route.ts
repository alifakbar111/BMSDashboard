import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildQuery } from "@/lib/query-builder";
import { aggregate } from "@/lib/aggregation";
import type { CardConfig, GlobalFilters } from "@/lib/types";

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
  aggregationType: string,
  yField: string,
): { data: Record<string, unknown>[]; aggregated: number } {
  if (rows.length === 0) return { data: [], aggregated: 0 };
  const values = rows.map((row) => getNumericValue(row, yField));
  const aggregated = aggregate(values, aggregationType as any);
  return { data: rows, aggregated };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, globalFilters } = body as { config: CardConfig; globalFilters: GlobalFilters };

    if (!config.dataSource) {
      return NextResponse.json({ error: "Card has no data source configured" }, { status: 400 });
    }

    const query = buildQuery(config, globalFilters);
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

    if (config.type === "kpi" || config.type === "gauge") {
      const yField = config.yAxis?.field ?? "";
      const result = processQueryResult(rawData, config.aggregation, yField);
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
