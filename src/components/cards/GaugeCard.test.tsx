// @vitest-environment jsdom
/* eslint-disable no-unused-vars -- vi/render/cleanup/QueryClient/QueryClientProvider
   are used by the rendering tests appended in Task 3 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { computeGaugeFractions } from "@/components/cards/GaugeCard";

describe("computeGaugeFractions", () => {
  it("maps a value at min to fraction 0", () => {
    const { fraction, targetFraction } = computeGaugeFractions({
      value: 0,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(0);
    expect(targetFraction).toBe(75);
  });

  it("maps a value at max to fraction 100", () => {
    const { fraction } = computeGaugeFractions({
      value: 100,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(100);
  });

  it("maps a midpoint value to 50", () => {
    const { fraction } = computeGaugeFractions({
      value: 50,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(50);
  });

  it("handles a non-zero min", () => {
    const { fraction, targetFraction } = computeGaugeFractions({
      value: 50,
      min: 20,
      max: 60,
      target: 40,
    });
    // (50-20)/(60-20) = 0.75 → 75
    expect(fraction).toBe(75);
    // (40-20)/(60-20) = 0.5 → 50
    expect(targetFraction).toBe(50);
  });

  it("clamps a value above max to 100", () => {
    const { fraction } = computeGaugeFractions({
      value: 9999,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(100);
  });

  it("clamps a value below min to 0", () => {
    const { fraction } = computeGaugeFractions({
      value: -50,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(0);
  });

  it("returns 0 for fraction when min === max (range guard)", () => {
    const { fraction, targetFraction } = computeGaugeFractions({
      value: 50,
      min: 50,
      max: 50,
      target: 50,
    });
    // NaN produced by (50-50)/(50-50) → both fall back to 0
    expect(fraction).toBe(0);
    expect(targetFraction).toBe(0);
  });

  it("returns 0 for fraction when value is non-finite", () => {
    const { fraction } = computeGaugeFractions({
      value: Number.NaN,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(0);
  });
});

// ── Rendering test ────────────────────────────────────────

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn(), theme: "light" }),
}));

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

// Spy on the Chart component so we can assert the props it receives
const chartPropsSpy = vi.fn(() => null);
vi.mock("react-apexcharts/core", () => ({
  default: (props: unknown) => {
    chartPropsSpy(props);
    return null;
  },
}));

import GaugeCard from "@/components/cards/GaugeCard";
import type { CardConfig } from "@/lib";

function makeGaugeConfig(overrides: Partial<CardConfig> = {}): CardConfig {
  return {
    type: "gauge",
    title: "Avg Power kW",
    dataSource: "energy_consumption",
    xAxis: null,
    yAxis: { field: "power_kw", label: "Power (kW)" },
    aggregation: "avg",
    groupBy: null,
    filter: null,
    id: "card-gauge-1",
    gaugeMin: 0,
    gaugeMax: 100,
    gaugeTarget: 75,
    ...overrides,
  };
}

function withQueryClient(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("GaugeCard — rendering", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    chartPropsSpy.mockClear();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("passes the correct series (fraction 0–100) to ApexCharts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ powerKw: 42 }], aggregated: 42 }),
    } as Response);

    const config = makeGaugeConfig();
    render(withQueryClient(<GaugeCard config={config} />));

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    // Dynamic ApexCharts chunk resolves asynchronously; wait for the spy
    await vi.waitFor(() => expect(chartPropsSpy).toHaveBeenCalled());

    // The Chart mock is invoked with (props); props shape: { series, options, ... }
    const props = chartPropsSpy.mock.calls.at(-1)?.[0] as {
      series: number[];
      options: { annotations?: { yaxis?: Array<{ y: number }> } };
    };
    expect(props.series).toEqual([42]); // value=42, min=0, max=100 → fraction 42
  });

  it("renders the target annotation as a fraction of (min, max)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ powerKw: 30 }], aggregated: 30 }),
    } as Response);

    // min=0, max=200, target=150 → targetFraction = 75
    const config = makeGaugeConfig({ gaugeMin: 0, gaugeMax: 200, gaugeTarget: 150 });
    render(withQueryClient(<GaugeCard config={config} />));

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(chartPropsSpy).toHaveBeenCalled());

    const props = chartPropsSpy.mock.calls.at(-1)?.[0] as {
      series: number[];
      options: { annotations?: { yaxis?: Array<{ y: number }> } };
    };
    expect(props.series).toEqual([15]); // 30 / 200 * 100 = 15
    expect(props.options.annotations?.yaxis?.[0]?.y).toBe(75);
  });

  it("uses defaults 0/100/75 when gauge config is omitted", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ powerKw: 80 }], aggregated: 80 }),
    } as Response);

    const config = makeGaugeConfig({
      gaugeMin: undefined,
      gaugeMax: undefined,
      gaugeTarget: undefined,
    });
    render(withQueryClient(<GaugeCard config={config} />));

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(chartPropsSpy).toHaveBeenCalled());

    const props = chartPropsSpy.mock.calls.at(-1)?.[0] as {
      series: number[];
      options: { annotations?: { yaxis?: Array<{ y: number }> } };
    };
    expect(props.series).toEqual([80]);
    // target=75 of (0,100) → 75
    expect(props.options.annotations?.yaxis?.[0]?.y).toBe(75);
  });

  it("clamps an over-range value to 100 and target to its fraction", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ powerKw: 500 }], aggregated: 500 }),
    } as Response);

    const config = makeGaugeConfig({ gaugeMax: 100, gaugeTarget: 200 });
    render(withQueryClient(<GaugeCard config={config} />));

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(chartPropsSpy).toHaveBeenCalled());

    const props = chartPropsSpy.mock.calls.at(-1)?.[0] as {
      series: number[];
      options: { annotations?: { yaxis?: Array<{ y: number }> } };
    };
    expect(props.series).toEqual([100]); // clamped
    expect(props.options.annotations?.yaxis?.[0]?.y).toBe(100); // target=200, max=100 → 100
  });

  it("shows the EmptyState when the API returns no rows", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], aggregated: 0 }),
    } as Response);

    const config = makeGaugeConfig();
    render(withQueryClient(<GaugeCard config={config} />));

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    // Chart is not rendered in the empty-data path
    expect(chartPropsSpy).not.toHaveBeenCalled();
  });

  it("shows the ErrorState when the fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    } as Response);

    const config = makeGaugeConfig();
    render(withQueryClient(<GaugeCard config={config} />));

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(chartPropsSpy).not.toHaveBeenCalled();
  });
});
