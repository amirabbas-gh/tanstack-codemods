import { QueryClient } from '@tanstack/react-query'

/**
 * Shared singleton for client + server invalidation after migrating `next/cache`.
 * Wire the same instance through your router root / TanStack Query provider.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
    },
  },
})
