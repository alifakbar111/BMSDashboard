import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const buildingId = searchParams.get("building_id");
  const floor = searchParams.get("floor");

  if (!buildingId || !floor) {
    return NextResponse.json(
      { error: "Missing required parameters: building_id, floor" },
      { status: 400 },
    );
  }
  const floorNum = parseInt(floor, 10);
  if (isNaN(floorNum)) {
    return NextResponse.json({ error: "Floor must be a number" }, { status: 400 });
  }

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
