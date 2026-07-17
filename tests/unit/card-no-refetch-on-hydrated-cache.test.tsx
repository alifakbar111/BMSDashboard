// tests/unit/card-no-refetch-on-hydrated-cache.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider, dehydrate, HydrationBoundary } from "@tanstack/react-query";

// Mock the dashboard store so the card has deterministic filters.
vi.mock("@/store/dashboard-store", () => ({
  useDashboardStore: () => ({
    filters: {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import KPICard from "@/components/cards/KPICard";
import { queryKeys } from "@/lib/queries";
import type { CardConfig, GlobalFilters } from "@/lib/schemas";

const FILTERS: GlobalFilters = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};

const CONFIG: CardConfig = {
  id: "kpi-hydrated",
  type: "kpi",
  title: "Hydrated KPI",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "energy_kwh", label: "kWh" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

function makeClientWithHydratedData() {
  // staleTime: Infinity so the warmed cache is considered fresh — no refetch
  // on mount. The default staleTime is 0 which would trigger a refetch.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
  client.setQueryData(queryKeys.card("kpi", CONFIG, FILTERS), {
    data: [],
    aggregated: 1234.5,
  });
  return client;
}

describe("useQuery — hydrated cache", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  afterEach(() => cleanup());

  it("KPICard does NOT call fetch on mount when the cache is already populated", async () => {
    const client = makeClientWithHydratedData();

    render(
      <QueryClientProvider client={client}>
        <KPICard config={CONFIG} />
      </QueryClientProvider>,
    );

    // Give React Query a tick to potentially start a refetch.
    await new Promise((r) => setTimeout(r, 50));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("dehydrate(hydratedClient) round-trips and useQuery finds the data", async () => {
    // Build client, populate, dehydrate, hydrate a new client, render.
    const server = makeClientWithHydratedData();
    const state = dehydrate(server);

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: Infinity },
      },
    });

    render(
      <QueryClientProvider client={client}>
        <HydrationBoundary state={state}>
          <KPICard config={CONFIG} />
        </HydrationBoundary>
      </QueryClientProvider>,
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
