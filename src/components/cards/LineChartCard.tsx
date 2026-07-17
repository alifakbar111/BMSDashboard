"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { useDashboardStore } from "@/store/dashboard-store";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getSeverityColor } from "@/lib/severity-color";
import type { CardConfig, QueryResult } from "@/lib";
import { fetchCardQuery, queryKeys } from "@/lib/queries";

/** Convert snake_case to camelCase (matching Prisma column names). */
function toCamelCase(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

const SERIES_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

/**
 * Custom Recharts tooltip that caps its height and scrolls when there are many
 * series. Without this, the default tooltip grows unbounded and can cover the
 * entire chart for queries with many groups (e.g. 10+ devices).
 */
export function ScrollableTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      data-testid="scrollable-tooltip"
      className="max-h-[200px] max-w-[260px] overflow-y-auto rounded-none border border-border bg-background text-xs shadow-sm"
      style={{ fontSize: 12 }}
    >
      {label !== undefined && label !== null && (
        <div className="sticky top-0 border-b border-border bg-background px-2 py-1 font-medium">
          {String(label)}
        </div>
      )}
      <ul className="m-0 list-none p-0">
        {payload.map((entry, idx) => (
          <li
            key={`${entry.name ?? "item"}-${idx}`}
            className="flex items-center justify-between gap-3 px-2 py-0.5"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span
                aria-hidden
                className="inline-block size-2 shrink-0"
                style={{ background: entry.color }}
              />
              <span className="truncate text-muted-foreground">
                {entry.name ?? entry.dataKey}
              </span>
            </span>
            <span className="shrink-0 font-mono tabular-nums">
              {typeof entry.value === "number"
                ? entry.value.toFixed(2)
                : String(entry.value ?? "")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface LineChartCardProps {
  config: CardConfig;
}

export default function LineChartCard({ config }: LineChartCardProps) {
  const { filters } = useDashboardStore();

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("line", config, filters),
    queryFn: ({ signal }) => fetchCardQuery(config, filters, signal),
    enabled: !!config.dataSource && !!config.xAxis && !!config.yAxis,
  });

  // Real-time clock for "now" indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Derive field names unconditionally so hooks below can be called in a stable order.
  // (All hooks must run on every render — see Rules of Hooks.)
  const xField = config.xAxis ? toCamelCase(config.xAxis.field) : null;
  const yField = config.yAxis ? toCamelCase(config.yAxis.field) : null;
  const groupField = config.groupBy ? toCamelCase(config.groupBy.field) : null;

  // Stabilize the `rows` reference. `data?.data ?? []` would otherwise produce a
  // fresh `[]` on every render when data is undefined, busting the pivotedData
  // memo and causing Recharts to re-render on every clock tick (infinite loop).
  const rows = useMemo<Record<string, unknown>[]>(
    () => (data?.data ?? []) as Record<string, unknown>[],
    [data],
  );

  // Discover the unique device-id (group) values. Memoized so the Line components
  // receive stable `key` and `dataKey` props across renders.
  const groups = useMemo<string[]>(() => {
    if (!groupField) return [];
    return [...new Set(rows.map((r) => String(r[groupField] ?? "")))]
      .filter((g) => g !== "");
  }, [rows, groupField]);

  // Pivot data when groupBy is set: each row becomes { xField, group1: y, group2: y, ... }
  // Every group key is pre-populated on every row (with `null` when missing) so
  // Recharts can draw a continuous line per device with `connectNulls`.
  const pivotedData = useMemo<Record<string, unknown>[]>(() => {
    if (!groupField || !xField || !yField) return rows;

    const map = new Map<string, Record<string, unknown>>();
    const keys: string[] = [];

    for (const row of rows) {
      const xVal = String(row[xField]);
      if (!map.has(xVal)) {
        const entry: Record<string, unknown> = { [xField]: xVal };
        // Pre-populate every known group with null so the line draws continuously
        // even when a device has no reading at this timestamp.
        for (const g of groups) entry[g] = null;
        map.set(xVal, entry);
        keys.push(xVal);
      }
      const entry = map.get(xVal)!;
      const groupVal = String(row[groupField] ?? "");
      if (groupVal) entry[groupVal] = row[yField];
    }

    return keys.map((k) => map.get(k)!);
  }, [rows, groupField, xField, yField, groups]);

  // Find the data point closest to "now" for the ReferenceLine
  const closestX = useMemo(() => {
    if (!xField || pivotedData.length === 0) return null;
    const nowMs = now.getTime();
    let closest: string | number = pivotedData[0][xField] as string | number;
    let minDiff = Infinity;

    for (const row of pivotedData) {
      const raw = row[xField];
      const ts =
        typeof raw === "string"
          ? new Date(raw).getTime()
          : typeof raw === "number"
            ? raw
            : NaN;
      if (!isNaN(ts)) {
        const diff = Math.abs(ts - nowMs);
        if (diff < minDiff) {
          minDiff = diff;
          closest = raw as string | number;
        }
      }
    }
    return closest;
  }, [pivotedData, now, xField]);

  // ---- Conditional renders below this line (all hooks are now above) ----

  if (!config.dataSource || !config.xAxis || !config.yAxis || !xField || !yField) {
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

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No data"
        description="No results match the current filters."
      />
    );
  }
  return (
    <div className="flex h-full flex-col">
      {/* Real-time clock indicator */}
      <div className="mb-1 flex items-center gap-2 px-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {now.toLocaleTimeString()}
        </span>
      </div>

      <div className="min-h-[160px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer
            data={pivotedData}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey={xField}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<ScrollableTooltip />} cursor={{ stroke: "var(--border)" }} />
            {groupField && <Legend />}

            {closestX !== null && (
              <ReferenceLine
                x={closestX}
                stroke="#ef4444"
                label={
                  <span className="text-[10px]">● now</span>
                }
              />
            )}

            {groupField
              ? groups.map((group, idx) => {
                  // When grouping by alert severity, color each line by its
                  // severity (Critical → red, Warning → orange, Info → blue).
                  // Non-severity groupings fall back to the rotation palette.
                  const severityColor =
                    groupField === "severity" ? getSeverityColor(group) : null;
                  const stroke =
                    severityColor ?? SERIES_COLORS[idx % SERIES_COLORS.length];
                  return (
                    <Line
                      key={group}
                      type="monotone"
                      dataKey={group}
                      name={group}
                      stroke={stroke}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  );
                })
              : (
                  <Line
                    type="monotone"
                    dataKey={yField}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
