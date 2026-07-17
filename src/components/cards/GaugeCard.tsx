"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useDashboardStore } from "@/store/dashboard-store";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { CardConfig, QueryResult } from "@/lib";

/**
 * Map a raw value/target pair to 0–100 fractions for a radial gauge.
 * - Guards against `max === min` by treating the range as 1
 * - Clamps to [0, 100] so out-of-range values stay inside the arc
 * - Returns 0 for any non-finite input (NaN/Infinity)
 *
 * Matches the math previously inlined in the old GaugeSvg component
 * (see git history of this file).
 */
export function computeGaugeFractions(args: {
  value: number;
  min: number;
  max: number;
  target: number;
}): { fraction: number; targetFraction: number } {
  const range = (args.max - args.min) || 1;
  const rawFraction = ((args.value - args.min) / range) * 100;
  const rawTarget = ((args.target - args.min) / range) * 100;
  const clamp = (n: number) =>
    Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  return { fraction: clamp(rawFraction), targetFraction: clamp(rawTarget) };
}

// ── ApexCharts options builder ─────────────────────────────

const COLOR_GREEN = "#10b981";
const COLOR_YELLOW = "#eab308";
const COLOR_RED = "#ef4444";

function buildGaugeOptions(args: {
  targetFraction: number;
  gaugeTarget: number;
  label: string;
}) {
  return {
    chart: {
      type: "radialBar" as const,
      animations: { enabled: true, speed: 800 },
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: "60%", margin: 0 },
        track: {
          background: "#e5e7eb",
          strokeWidth: "100%",
          margin: 0,
        },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "24px",
            fontWeight: 700,
            offsetY: 8,
            formatter: (val: number) => val.toFixed(0),
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.3,
        gradientToColors: [COLOR_GREEN, COLOR_YELLOW, COLOR_RED],
        stops: [0, 50, 100],
      },
    },
    labels: [args.label],
    annotations: {
      yaxis: [
        {
          y: args.targetFraction,
          yAxisIndex: 0,
          borderColor: "#6b7280",
          strokeDashArray: 4,
          label: {
            text: `Target: ${args.gaugeTarget}`,
            position: "left",
            style: { fontSize: "10px", color: "#6b7280" },
          },
        },
      ],
    },
  };
}

// ── Dynamic ApexCharts loader (ssr: false) ────────────────

// The side-effect imports register the radialBar and annotations features
// inside ApexCharts. They MUST live inside the dynamic() callback so the
// bundler does not evaluate them on the server (ApexCharts touches `window`).
const ApexGauge = dynamic(
  async () => {
    const { default: ReactApexChart } = await import("react-apexcharts/core");
    await import("apexcharts/radialBar");
    await import("apexcharts/features/annotations");
    return ReactApexChart;
  },
  {
    ssr: false,
    loading: () => <LoadingState variant="text" count={2} />,
  },
);

// ── Public component ───────────────────────────────────────

interface GaugeChartProps {
  config: CardConfig;
}

export default function GaugeCard({ config }: GaugeChartProps) {
  const { filters } = useDashboardStore();

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: ["gauge", config, filters],
    queryFn: async () => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, globalFilters: filters }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
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
  const { fraction, targetFraction } = computeGaugeFractions({
    value,
    min: gaugeMin,
    max: gaugeMax,
    target: gaugeTarget,
  });
  const options = buildGaugeOptions({
    targetFraction,
    gaugeTarget,
    label: config.yAxis?.label ?? "",
  });

  return (
    <div className="flex h-full flex-col items-center justify-center py-4">
      <ApexGauge
        options={options}
        series={[fraction]}
        type="radialBar"
        height={220}
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
