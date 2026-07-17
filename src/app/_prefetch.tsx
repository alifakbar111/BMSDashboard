// src/app/_prefetch.tsx
import "server-only";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { fetchCardQuery, queryKeys } from "@/lib/queries";
import { DEFAULT_DASHBOARD_CARDS, DEFAULT_FILTERS } from "@/lib/default-dashboard";
import type { ReactNode } from "react";

/**
 * Server component that prefetches every default card's query, dehydrates
 * the cache, and renders children inside a HydrationBoundary so the
 * client-side useQuery calls find their data already present.
 *
 * `Promise.all` runs the prefetches in parallel — the slowest single
 * query bounds the wait, not the sum of all queries.
 */
export async function PrefetchedDashboard({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  await Promise.all(
    DEFAULT_DASHBOARD_CARDS.map(async (card) => {
      const config = card.config;
      // Skip prefetch for unconfigured cards; matches the cards' `enabled` guard.
      const isEnabled =
        !!config.dataSource &&
        !!config.yAxis &&
        (config.type === "kpi" || config.type === "gauge"
          ? true
          : !!config.xAxis);
      if (!isEnabled) return;
      await queryClient.prefetchQuery({
        queryKey: queryKeys.card(config.type, config, DEFAULT_FILTERS),
        queryFn: () => fetchCardQuery(config, DEFAULT_FILTERS),
      });
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
