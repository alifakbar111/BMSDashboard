"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/store/dashboard-store";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { CardConfig, QueryResult } from "@/lib";
import { fetchCardQuery, queryKeys } from "@/lib/queries";

interface GaugeChartProps {
  config: CardConfig;
}

export default function GaugeCard({ config }: GaugeChartProps) {
  const { filters } = useDashboardStore();

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("gauge", config, filters),
    queryFn: ({ signal }) => fetchCardQuery(config, filters, signal),
    enabled: !!config.dataSource && !!config.yAxis,
  });

  if (!config.dataSource || !config.yAxis) {
    return null;
  }

  if (isLoading) {
    return <LoadingState variant="text" count={2} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (data?.data && data.data.length === 0) {
    return (
      <EmptyState
        title="No data"
        description="No results match the current filters."
      />
    );
  }

  const value = data?.aggregated ?? 0;
  const { gaugeMin = 0, gaugeMax = 100, gaugeTarget = 75 } = config;

  return (
    <div className="flex h-full flex-col items-center justify-center py-4">
      <GaugeSvg
        value={value}
        min={gaugeMin}
        max={gaugeMax}
        target={gaugeTarget}
      />
      {config.yAxis?.label && (
        <div className="mt-1 text-xs text-muted-foreground">
          {config.yAxis.label}
        </div>
      )}
      <div className="mt-1 inline-block rounded-none bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {config.aggregation}
      </div>
    </div>
  );
}

// ── SVG Gauge ──────────────────────────────────────────────

interface GaugeSvgProps {
  value: number;
  min: number;
  max: number;
  target: number;
}

function GaugeSvg({ value, min, max, target }: GaugeSvgProps) {
  const cx = 100;
  const cy = 90;
  const r = 70;
  const range = max - min || 1;

  const clampedValue = Math.max(min, Math.min(max, value));
  const clampedTarget = Math.max(min, Math.min(max, target));
  const fraction = (clampedValue - min) / range;
  const targetFraction = (clampedTarget - min) / range;

  // Angles: arc goes from PI (left) to 2*PI (right) through the bottom
  const valueAngle = Math.PI + fraction * Math.PI;
  const targetAngle = Math.PI + targetFraction * Math.PI;

  // Foreground arc end point
  const fgEndX = cx + r * Math.cos(valueAngle);
  const fgEndY = cy + r * Math.sin(valueAngle);

  // Target marker end point (vertical line)
  const targetX = cx + r * Math.cos(targetAngle);
  const targetY = cy + r * Math.sin(targetAngle);

  // Color based on value vs target
  const color =
    clampedValue >= clampedTarget
      ? "#22c55e"
      : clampedValue >= clampedTarget * 0.75
        ? "#f59e0b"
        : "#ef4444";

  return (
    <svg viewBox="0 0 200 130" className="h-28 w-full max-w-[200px]">
      {/* Background arc — full half-circle */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Foreground arc — value portion */}
      {fraction > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${fgEndX} ${fgEndY}`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
        />
      )}

      {/* Target marker */}
      <line
        x1={targetX}
        y1={targetY - 8}
        x2={targetX}
        y2={targetY + 8}
        stroke="#6b7280"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Value text */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="28"
        fontWeight="bold"
        className="fill-foreground"
      >
        {Math.round(clampedValue)}
      </text>

      {/* Min label */}
      <text
        x={cx - r}
        y={cy + 20}
        textAnchor="middle"
        fontSize="10"
        className="fill-muted-foreground"
      >
        {min}
      </text>

      {/* Max label */}
      <text
        x={cx + r}
        y={cy + 20}
        textAnchor="middle"
        fontSize="10"
        className="fill-muted-foreground"
      >
        {max}
      </text>

      {/* Target label */}
      <text
        x={cx}
        y={cy + 34}
        textAnchor="middle"
        fontSize="10"
        className="fill-muted-foreground"
      >
        Target: {target}
      </text>
    </svg>
  );
}
