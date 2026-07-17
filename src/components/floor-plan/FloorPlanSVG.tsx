"use client";

import { useState, useCallback } from "react";
import { ZoneOverlay } from "./ZoneOverlay";
import { OccupancyTooltip } from "./OccupancyTooltip";
import type { ZoneData } from "./OccupancyTooltip";

interface FloorPlanSVGProps {
  zones: ZoneData[];
  buildingId: string;
  floor: number;
}

interface TooltipState {
  data: ZoneData;
  pageX: number;
  pageY: number;
}

function buildZoneMap(zones: ZoneData[]): Map<string, ZoneData> {
  const map = new Map<string, ZoneData>();
  for (const zone of zones) {
    map.set(zone.zone, zone);
  }
  return map;
}

const ZONE_LAYOUTS: Record<
  string,
  { label: string; x: number; y: number; width: number; height: number }
> = {
  "Zone-A": { label: "Open Workspace", x: 20, y: 20, width: 340, height: 360 },
  "Zone-B": { label: "Meeting Rooms", x: 380, y: 20, width: 200, height: 200 },
  "Zone-C": { label: "Server Room", x: 380, y: 240, width: 200, height: 140 },
};

function FloorPlanSVG({ zones, buildingId, floor }: FloorPlanSVGProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const zoneMap = buildZoneMap(zones);

  const handleHover = useCallback(
    (data: ZoneData, pageX: number, pageY: number) => {
      setTooltip({ data, pageX, pageY });
    },
    [],
  );

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div data-slot="floor-plan-svg" className="relative overflow-x-auto">
      <svg
        viewBox="0 0 600 420"
        className="block h-auto min-w-[500px]"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Floor plan for ${buildingId} Floor ${floor}`}
      >
        {/* Building outline */}
        <rect
          x={10}
          y={10}
          width={580}
          height={400}
          rx={6}
          ry={6}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-border"
        />

        {/* Vertical divider wall */}
        <line
          x1={370}
          y1={10}
          x2={370}
          y2={410}
          stroke="currentColor"
          strokeWidth={2}
          className="text-border"
        />

        {/* Zone overlays */}
        {Object.entries(ZONE_LAYOUTS).map(([zoneKey, layout]) => {
          const zoneData = zoneMap.get(zoneKey) ?? null;
          return (
            <ZoneOverlay
              key={zoneKey}
              zoneData={zoneData}
              x={layout.x}
              y={layout.y}
              width={layout.width}
              height={layout.height}
              label={layout.label}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          );
        })}

        {/* Building label at top */}
        <text
          x={300}
          y={404}
          textAnchor="middle"
          fill="currentColor"
          fontSize="12"
          className="text-muted-foreground"
        >
          {buildingId} — Floor {floor}
        </text>

        {/* Legend */}
        <rect x={20} y={388} width={8} height={8} rx={1} ry={1} fill="#22c55e" />
        <text x={32} y={395} fill="currentColor" fontSize="9" className="text-muted-foreground">
          &lt;40%
        </text>
        <rect x={65} y={388} width={8} height={8} rx={1} ry={1} fill="#f59e0b" />
        <text x={77} y={395} fill="currentColor" fontSize="9" className="text-muted-foreground">
          40-75%
        </text>
        <rect x={120} y={388} width={8} height={8} rx={1} ry={1} fill="#ef4444" />
        <text x={132} y={395} fill="currentColor" fontSize="9" className="text-muted-foreground">
          &gt;75%
        </text>
        <rect x={170} y={388} width={8} height={8} rx={1} ry={1} fill="#d1d5db" />
        <text x={182} y={395} fill="currentColor" fontSize="9" className="text-muted-foreground">
          No data
        </text>
      </svg>

      {/* Tooltip rendered outside SVG for clean positioning */}
      {tooltip && (
        <OccupancyTooltip
          data={tooltip.data}
          pageX={tooltip.pageX}
          pageY={tooltip.pageY}
        />
      )}
    </div>
  );
}

export default FloorPlanSVG;
