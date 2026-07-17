// src/lib/queries.ts
/**
 * Shared query-key + query-function factories used by both the server
 * (prefetchQuery) and the client (useQuery). Keeping keys in one place
 * guarantees the dehydrated cache hits on the client side.
 *
 * This module is universal: it imports neither `server-only` nor
 * any browser-only API. Card components can import it freely.
 */
import type { CardConfig, GlobalFilters, QueryResult } from "@/lib/schemas";

/** Query-key factory. The shape MUST stay stable across versions — changing
 *  it invalidates every cached entry in production. */
export const queryKeys = {
  /** All keys related to dashboard card queries. */
  all: ["bms"] as const,
  card: (kind: CardConfig["type"], config: CardConfig, filters: GlobalFilters) =>
    [kind, config, filters] as const,
  occupancy: (buildingId: string, floor: number) =>
    ["occupancy", buildingId, floor] as const,
};

/** Shared queryFn for /api/query. Posts the card config + current global
 *  filters and returns the parsed JSON. Throws on non-2xx so React Query
 *  enters its error state. */
export async function fetchCardQuery(
  config: CardConfig,
  filters: GlobalFilters,
  signal?: AbortSignal,
): Promise<QueryResult> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, globalFilters: filters }),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
      error?: string;
    };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as QueryResult;
}

/** Shared queryFn for /api/occupancy/latest. */
export async function fetchOccupancy(
  buildingId: string,
  floor: number,
  signal?: AbortSignal,
): Promise<{
  buildingId: string;
  floor: number;
  zones: unknown[];
  timestamp: string;
}> {
  const params = new URLSearchParams({
    building_id: buildingId,
    floor: String(floor),
  });
  const res = await fetch(`/api/occupancy/latest?${params}`, {
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch occupancy data: ${res.statusText}`);
  }
  return (await res.json()) as {
    buildingId: string;
    floor: number;
    zones: unknown[];
    timestamp: string;
  };
}
