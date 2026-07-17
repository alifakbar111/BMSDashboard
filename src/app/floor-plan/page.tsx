import "server-only";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { fetchOccupancy, queryKeys } from "@/lib/queries";
import FloorPlanClient from "./FloorPlanClient";

/** Prefetch the first (default) tab so the very first paint has data. */
const DEFAULT_BUILDING = "BLD-001";
const DEFAULT_FLOOR = 1;

export default async function FloorPlanPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.occupancy(DEFAULT_BUILDING, DEFAULT_FLOOR),
    queryFn: () => fetchOccupancy(DEFAULT_BUILDING, DEFAULT_FLOOR),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FloorPlanClient />
    </HydrationBoundary>
  );
}
