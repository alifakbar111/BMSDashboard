// tests/unit/prefetch-shape.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  // Force server branch.
  vi.doMock("@tanstack/react-query", async () => {
    const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
      "@tanstack/react-query",
    );
    return { ...actual, isServer: true };
  });
  // Stub fetch so prefetch doesn't hit the network.
  global.fetch = vi.fn(async (url: unknown) => {
    if (String(url).includes("/api/query")) {
      return new Response(JSON.stringify({ data: [], aggregated: 42 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
});

describe("PrefetchedDashboard (server-only)", () => {
  it("dehydrate() contains one entry per prefetched default card", async () => {
    const { getQueryClient } = await import("../../src/lib/get-query-client");
    const { queryKeys, fetchCardQuery } = await import("../../src/lib/queries");
    const { DEFAULT_DASHBOARD_CARDS, DEFAULT_FILTERS } = await import(
      "../../src/lib/default-dashboard"
    );
    const { dehydrate } = await import("@tanstack/react-query");

    const qc = getQueryClient();
    await Promise.all(
      DEFAULT_DASHBOARD_CARDS
        .filter((card) => card.config.dataSource && card.config.yAxis)
        .map((card) =>
          qc.prefetchQuery({
            queryKey: queryKeys.card(card.config.type, card.config, DEFAULT_FILTERS),
            queryFn: () => fetchCardQuery(card.config, DEFAULT_FILTERS),
          }),
        ),
    );

    const state = dehydrate(qc);
    // The shape React Query v5 ships: { queries: [{ queryHash, queryKey, state: { data, ... } }] }
    expect(Array.isArray(state.queries)).toBe(true);
    expect(state.queries.length).toBe(DEFAULT_DASHBOARD_CARDS.length);

    // Each prefetched key must be a 3-tuple of [kind, config, filters].
    for (const entry of state.queries) {
      expect(Array.isArray(entry.queryKey)).toBe(true);
      const [kind] = entry.queryKey as [string, ...unknown[]];
      expect(["kpi", "bar", "line", "gauge"]).toContain(kind);
      expect(entry.state).toBeDefined();
      expect((entry.state as { data: unknown }).data).toBeDefined();
    }
  });
});
