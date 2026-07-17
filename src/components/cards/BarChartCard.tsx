"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboardStore } from "@/store/dashboard-store";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { CardConfig, QueryResult } from "@/lib";
import { fetchCardQuery, queryKeys } from "@/lib/queries";

/** Convert snake_case field name to camelCase (matching Prisma column names). */
function toCamelCase(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

interface BarChartCardProps {
  config: CardConfig;
}

export default function BarChartCard({ config }: BarChartCardProps) {
  const { filters } = useDashboardStore();

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("bar", config, filters),
    queryFn: ({ signal }) => fetchCardQuery(config, filters, signal),
    enabled: !!config.dataSource && !!config.xAxis && !!config.yAxis,
  });

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

  return (
    <div className="h-full min-h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer
          data={rows}
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
          <Bar dataKey={yField} fill="#3b82f6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
