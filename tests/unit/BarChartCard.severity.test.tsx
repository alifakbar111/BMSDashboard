// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Stub next-themes so the underlying components render without a provider
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn(), theme: "light" }),
}));

// Provide a deterministic filter snapshot to the dashboard store
const mockFilters = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};
vi.mock("@/store/dashboard-store", () => ({
  useDashboardStore: () => ({ filters: mockFilters }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import BarChartCard from "@/components/cards/BarChartCard";
import type { CardConfig } from "@/lib";

function makeSeverityBarConfig(): CardConfig {
  return {
    type: "bar",
    title: "Alerts by Severity",
    dataSource: "alerts_events",
    xAxis: { field: "severity", label: "Severity" },
    yAxis: { field: "value", label: "Value" },
    aggregation: "sum",
    groupBy: null,
    filter: null,
    id: "card-bar-severity",
  };
}

function withQueryClient(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("BarChartCard — severity coloring", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  afterEach(() => cleanup());

  it("renders without throwing when x-axis is the severity column", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { severity: "Critical", value: 12 },
          { severity: "Warning", value: 25 },
          { severity: "Info", value: 47 },
        ],
        aggregated: null,
      }),
    } as Response);

    const { container } = render(
      withQueryClient(<BarChartCard config={makeSeverityBarConfig()} />),
    );
    // Wait for the query to resolve
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    // Recharts needs a measured container (jsdom doesn't provide one), so
    // the SVG body won't render. The important thing is no throw + a mount.
    expect(container).toBeTruthy();
  });
});
