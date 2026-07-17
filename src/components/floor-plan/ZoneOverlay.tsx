"use client";

import { useCallback } from "react";
import type { ZoneData } from "./OccupancyTooltip";

const ONE_HOUR_MS = 60 * 60 * 1000;

interface OccupancyColors {
  fill: string;
  stroke: string;
  stale: boolean;
}

function getOccupancyColors(
  rate: number | null | undefined,
  timestamp: string | null | undefined,
): OccupancyColors {
  if (!timestamp) {
    return { fill: "#d1d5db", stroke: "#9ca3af", stale: true };
  }
  const age = Date.now() - new Date(timestamp).getTime();
  if (age > ONE_HOUR_MS) {
    return { fill: "#d1d5db", stroke: "#9ca3af", stale: true };
  }
  if (rate === null || rate === undefined) {
    return { fill: "#d1d5db", stroke: "#9ca3af", stale: true };
  }
  if (rate <= 40) {
    return { fill: "#22c55e", stroke: "#16a34a", stale: false };
  }
  if (rate <= 75) {
    return { fill: "#f59e0b", stroke: "#d97706", stale: false };
  }
  return { fill: "#ef4444", stroke: "#dc2626", stale: false };
}

interface ZoneOverlayProps {
  zoneData: ZoneData | null;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onHover: (data: ZoneData, pageX: number, pageY: number) => void;
  onLeave: () => void;
}

function ZoneOverlay({
  zoneData,
  x,
  y,
  width,
  height,
  label,
  onHover,
  onLeave,
}: ZoneOverlayProps) {
  const rate = zoneData?.occupancyRatePercent ?? null;
  const timestamp = zoneData?.timestamp ?? null;
  const { fill, stroke, stale } = getOccupancyColors(rate, timestamp);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (zoneData) {
        onHover(zoneData, e.pageX, e.pageY);
      }
    },
    [zoneData, onHover],
  );

  const handleMouseLeave = useCallback(() => {
    onLeave();
  }, [onLeave]);

  const fillOpacity = stale ? 0.3 : 0.6;

  return (
    <g data-slot="zone-overlay">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        ry={4}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={1.5}
        className="cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="currentColor"
        fontSize="13"
        fontWeight="600"
        className="pointer-events-none select-none"
      >
        {stale ? "No data" : label}
      </text>
      {!stale && zoneData && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="currentColor"
          fontSize="11"
          className="pointer-events-none select-none"
        >
          {zoneData.personCount ?? "—"} people
        </text>
      )}
    </g>
  );
}

export { ZoneOverlay };
export type { OccupancyColors };
