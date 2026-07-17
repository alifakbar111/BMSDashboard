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
import type { CardConfig, QueryResult } from "@/lib";

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

interface LineChartCardProps {
  config: CardConfig;
}

export default function LineChartCard({ config }: LineChartCardProps) {
  const { filters } = useDashboardStore();

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: ["line", config, filters],
    queryFn: async () => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, globalFilters: filters }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    enabled: !!config.dataSource && !!config.xAxis && !!config.yAxis,
  });

  // Real-time clock for "now" indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!config.dataSource || !config.xAxis || !config.yAxis) {
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

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No data"
        description="No results match the current filters."
      />
    );
  }

  const xField = toCamelCase(config.xAxis.field);
  const yField = toCamelCase(config.yAxis.field);
  const groupField = config.groupBy ? toCamelCase(config.groupBy.field) : null;

  // Pivot data when groupBy is set: each row becomes { xField, group1: y, group2: y, ... }
  const pivotedData = useMemo(() => {
    if (!groupField) return rows;

    const map = new Map<string, Record<string, unknown>>();
    // Preserve insertion order
    const keys: string[] = [];

    for (const row of rows) {
      const xVal = String(row[xField]);
      if (!map.has(xVal)) {
        map.set(xVal, { [xField]: xVal });
        keys.push(xVal);
      }
      const entry = map.get(xVal)!;
      entry[String(row[groupField])] = row[yField];
    }

    return keys.map((k) => map.get(k)!);
  }, [rows, groupField, xField, yField]);

  const groups = groupField
    ? [...new Set(rows.map((r) => String(r[groupField] ?? "")))]
    : [null];

  // Find the data point closest to "now" for the ReferenceLine
  const closestX = useMemo(() => {
    if (pivotedData.length === 0) return null;
    const nowMs = now.getTime();
    let closest = pivotedData[0][xField];
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
          closest = raw;
        }
      }
    }
    return closest as string | number;
  }, [pivotedData, now, xField]);

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

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 0,
                border: "1px solid hsl(var(--border))",
              }}
            />
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
              ? groups.map((group, idx) => (
                  <Line
                    key={group}
                    type="monotone"
                    dataKey={group ?? ""}
                    name={group ?? "Unknown"}
                    stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))
              : (
                  <Line
                    type="monotone"
                    dataKey={yField}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
