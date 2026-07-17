import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OccupancyQueryParamsSchema } from "@/lib/schemas";

export function getLatestPerZone(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const zoneMap = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const zone = String(row.zone ?? "");
    if (!zone) continue;
    const existing = zoneMap.get(zone);
    if (!existing || new Date(String(row.timestamp)) > new Date(String(existing.timestamp))) {
      zoneMap.set(zone, row);
    }
  }
  return Array.from(zoneMap.values());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = OccupancyQueryParamsSchema.safeParse({
    building_id: searchParams.get("building_id"),
    floor: searchParams.get("floor"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { building_id: buildingId, floor: floorNum } = parsed.data;

  try {
    const rows = await prisma.occupancy.findMany({
      where: { buildingId, floor: floorNum },
      orderBy: { timestamp: "desc" },
    });
    const latestPerZone = getLatestPerZone(rows as unknown as Record<string, unknown>[]);
    return NextResponse.json({
      buildingId,
      floor: floorNum,
      zones: latestPerZone,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Occupancy API error:", e);
    return NextResponse.json({ error: "Failed to fetch occupancy data" }, { status: 500 });
  }
}
