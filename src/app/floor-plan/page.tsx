"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FloorPlanSVG from "@/components/floor-plan/FloorPlanSVG";
import type { ZoneData } from "@/components/floor-plan/OccupancyTooltip";
import { cn } from "@/lib/utils";

interface OccupancyResponse {
  buildingId: string;
  floor: number;
  zones: ZoneData[];
  timestamp: string;
}

const BUILDING_FLOORS = [
  { buildingId: "BLD-001", floor: 1, label: "BLD-001 F1" },
  { buildingId: "BLD-001", floor: 2, label: "BLD-001 F2" },
  { buildingId: "BLD-002", floor: 1, label: "BLD-002 F1" },
  { buildingId: "BLD-002", floor: 2, label: "BLD-002 F2" },
] as const;

async function fetchOccupancy(
  buildingId: string,
  floor: number,
): Promise<OccupancyResponse> {
  const params = new URLSearchParams({ building_id: buildingId, floor: String(floor) });
  const res = await fetch(`/api/occupancy/latest?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch occupancy data: ${res.statusText}`);
  }
  return res.json();
}

function OccupancyDot({ isFetching }: { isFetching: boolean }) {
  return (
    <span className="relative inline-flex size-2">
      {isFetching ? (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-muted-foreground/40" />
      ) : (
        <span className="absolute inline-flex size-full rounded-full bg-green-500" />
      )}
      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
    </span>
  );
}

export default function FloorPlanPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = BUILDING_FLOORS[selectedIndex];

  const { data, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["occupancy", selected.buildingId, selected.floor],
    queryFn: () => fetchOccupancy(selected.buildingId, selected.floor),
    refetchInterval: 30_000,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold">Floor Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time occupancy across building zones
        </p>
      </div>

      {/* Building/floor tabs */}
      <div
        className="flex w-fit gap-1 rounded-lg bg-muted p-1"
        role="tablist"
        aria-label="Select building and floor"
      >
        {BUILDING_FLOORS.map((bf, idx) => (
          <button
            key={`${bf.buildingId}-${bf.floor}`}
            role="tab"
            aria-selected={idx === selectedIndex}
            onClick={() => setSelectedIndex(idx)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              idx === selectedIndex
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {bf.label}
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {isFetching && (
          <span className="text-xs italic">Refreshing&hellip;</span>
        )}
        {!isFetching && lastUpdated && (
          <>
            <OccupancyDot isFetching={isFetching} />
            <span>Last updated: {lastUpdated}</span>
          </>
        )}
      </div>

      {/* Content area */}
      <div className="mt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading floor plan&hellip;</p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="text-sm text-destructive">Failed to load occupancy data</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Retry
            </button>
          </div>
        )}

        {data && !isLoading && (
          <FloorPlanSVG
            zones={data.zones}
            buildingId={data.buildingId}
            floor={data.floor}
          />
        )}
      </div>
    </main>
  );
}
