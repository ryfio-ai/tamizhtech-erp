import { QueryClient, defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";

/**
 * Creates a request-safe QueryClient configured for enterprise ERP operations.
 * Enforces:
 * - Safe default stale times
 * - In-memory only cache (zero localStorage/IndexedDB leak of financial/customer PII)
 * - Safe retry policies (never blindly retry 401, 403, 404, 422, or financial mutations)
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute default for operational data
        gcTime: 5 * 60 * 1000, // 5 minutes in-memory garbage collection
        refetchOnWindowFocus: false, // Prevents jarring table/form jumps while multitasking
        retry: (failureCount, error: any) => {
          const status = error?.status || error?.response?.status;
          // Security & Business boundary: Never retry authorization, validation, or not found errors
          if (status === 401 || status === 403 || status === 404 || status === 422 || status === 409) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false, // Mutative financial/operational actions must never blindly auto-retry
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Lifecycle-safe query client provider:
 * - Server: Always creates a NEW request-scoped instance (never shares across users!)
 * - Browser: Single client-side singleton during user session
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

/**
 * Clears in-memory query cache on logout or security context invalidation.
 */
export function clearBrowserQueryCache(): void {
  if (browserQueryClient) {
    browserQueryClient.clear();
  }
}
