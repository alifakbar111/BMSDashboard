// src/lib/get-query-client.ts
// NOTE: This module is universal (importable from both server and client).
// The `isServer` check below isolates the two branches. Do NOT add
// `import "server-only"` here — QueryProvider ("use client") needs to
// import this on every mount to get the browser singleton.
import { QueryClient, isServer } from "@tanstack/react-query";

/**
 * Returns a QueryClient appropriate for the current runtime.
 *
 * - Server (per request): brand new client every call. Prevents cross-request
 *   cache leakage and dangling background timers.
 * - Client (per tab): singleton on globalThis. Survives HMR and matches
 *   React Query's documented single-client-per-tab model.
 *
 * `isServer` from @tanstack/react-query is the recommended way to detect the
 * environment — it is set at build time and is reliable in both RSC and
 * client components.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        // During SSR we don't want a failed prefetch to throw into the render
        // tree — we'd rather render with no data and let the client refetch.
        // On the client we still surface errors via the `error` state.
        throwOnError: isServer,
      },
    },
  });
}

let browserSingleton: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Each server-side render gets a fresh client.
    return makeQueryClient();
  }
  // Browser: reuse across renders and HMR reloads.
  if (!browserSingleton) {
    browserSingleton = makeQueryClient();
  }
  return browserSingleton;
}
