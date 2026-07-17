// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// next-themes: avoid pulling in the full provider, just stub what useTheme reads
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn(), theme: "light" }),
}));

// Mock the dashboard store so we control the filters prop
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

// Mock fetch so useQuery has data to work with on the second render
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Import after mocks are set up
import LineChartCard from "@/components/cards/LineChartCard";
import type { CardConfig } from "@/lib";

function makeConfig(): CardConfig {
  return {
    type: "line",
    title: "Energy Trend by Device",
    dataSource: "energy_consumption",
    xAxis: { field: "timestamp", label: "Timestamp" },
    yAxis: { field: "energy_kwh", label: "Energy Kwh" },
    aggregation: "sum",
    groupBy: { field: "device_id", label: "Device Id" },
    filter: null,
    id: "card-1784277029186-gcngp7",
  };
}

function withQueryClient(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("LineChartCard — Rules of Hooks", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockFetch.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  // Regression: when the API returns an empty data array, the component used to
  // early-return BEFORE calling its two useMemo hooks. On a subsequent render
  // where data IS present, React saw a different hook count and threw:
  //   "React has detected a change in the order of Hooks called by LineChartCard."
  // The fix is to lift every hook call above any conditional return.
  it("does not violate Rules of Hooks across renders (empty data → data)", async () => {
    const config = makeConfig();

    // First fetch resolves with empty data (no rows → early-return path used to skip useMemo).
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], aggregated: null }),
    } as Response);

    const { rerender } = render(withQueryClient(<LineChartCard config={config} />));

    // Wait for the first query to resolve
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Now a real payload arrives (simulates a refetch with data).
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { energyKwh: 28.5, timestamp: "2025-05-31T17:00:00.000Z", deviceId: "HVAC-A1-01" },
          { energyKwh: 42.8, timestamp: "2025-05-31T18:00:00.000Z", deviceId: "HVAC-A1-01" },
          { energyKwh: 28.5, timestamp: "2025-05-31T17:00:00.000Z", deviceId: "ELEC-A2-SR" },
        ],
        aggregated: null,
      }),
    } as Response);

    // Rerender with a new query key to force a refetch (simulates filter change).
    rerender(
      withQueryClient(
        <LineChartCard
          config={{ ...config, id: "card-1784277029186-gcngp7-rerendered" }}
        />,
      ),
    );

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Allow any React warnings to flush
    await new Promise((r) => setTimeout(r, 50));

    // The bug surfaces as a console.error call from React about hook order.
    const hookOrderWarnings = consoleErrorSpy.mock.calls.filter((args) => {
      const msg = String(args[0] ?? "");
      return (
        msg.includes("order of Hooks") ||
        msg.includes("Rendered fewer hooks") ||
        msg.includes("Rendered more hooks")
      );
    });

    expect(hookOrderWarnings).toEqual([]);
  });
});
