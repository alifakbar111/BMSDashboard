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
  zoneKey: string;
  floor: number;
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
  zoneKey,
  floor,
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
      // Always fire onHover, even when the zone has no occupancy data,
      // so the user gets feedback (a "no data" tooltip) instead of silence.
      onHover(
        zoneData ?? { zone: zoneKey, floor, timestamp: null },
        e.pageX,
        e.pageY,
      );
    },
    [zoneData, zoneKey, floor, onHover],
  );

  const handleMouseLeave = useCallback(() => {
    onLeave();
  }, [onLeave]);

  const fillOpacity = stale ? 0.3 : 0.6;
  const cx = x + width / 2;
  const cy = y + height / 2;

  return (
    <g data-slot="zone-overlay">
      {/*
        Base color fill. Stale zones get a muted gray; live zones get the
        occupancy-derived color (green / amber / red).
      */}
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
        strokeDasharray={stale ? "4 3" : undefined}
        className="cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/*
        Stale-zone hatch overlay. A diagonal stripe pattern makes "no data"
        visually distinct from a low-occupancy (green) zone, so users can tell
        at a glance whether a zone is genuinely empty or just stale.
      */}
      {stale && (
        <g pointerEvents="none" aria-hidden>
          <defs>
            <pattern
              id={`hatch-${zoneKey}`}
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke="#6b7280"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </pattern>
          </defs>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={4}
            ry={4}
            fill={`url(#hatch-${zoneKey})`}
          />
        </g>
      )}

      {/* Zone label (friendly name) — always shown */}
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="600"
        className="pointer-events-none select-none"
      >
        {label}
      </text>

      {/* Zone key (e.g. "Zone-A") — small caption above the person count */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        fill="currentColor"
        fontSize="9"
        className="pointer-events-none select-none fill-muted-foreground"
      >
        {zoneKey}
      </text>

      {/* Person count (live) or "No data" badge (stale) */}
      {stale ? (
        <g pointerEvents="none">
          <rect
            x={cx - 32}
            y={cy + 6}
            width={64}
            height={14}
            rx={2}
            ry={2}
            fill="#6b7280"
            fillOpacity="0.9"
          />
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9"
            fontWeight="700"
            letterSpacing="0.5"
            className="select-none"
          >
            NO DATA
          </text>
        </g>
      ) : (
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fill="currentColor"
          fontSize="11"
          fontWeight="500"
          className="pointer-events-none select-none"
        >
          {zoneData?.personCount ?? "—"} people
        </text>
      )}
    </g>
  );
}

export { ZoneOverlay };
export type { OccupancyColors };
