"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/store/dashboard-store";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import type { CardConfig, QueryResult } from "@/lib";
import { fetchCardQuery, queryKeys } from "@/lib/queries";

interface KPICardProps {
  config: CardConfig;
}

export default function KPICard({ config }: KPICardProps) {
  const { filters } = useDashboardStore();

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("kpi", config, filters),
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

  const value = data?.aggregated;
  const displayValue =
    value !== null && value !== undefined
      ? Number(value).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : "\u2014";

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="text-4xl font-bold tracking-tight">{displayValue}</div>
      {config.yAxis?.label && (
        <div className="mt-1 text-xs text-muted-foreground">
          {config.yAxis.label}
        </div>
      )}
      {/* Unit is not part of CardConfig — skip */}
      <div className="mt-2 inline-block rounded-none bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {config.aggregation}
      </div>
    </div>
  );
}
