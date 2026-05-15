import { QueryClient } from '@tanstack/react-query'

/**
 * Shared singleton for client + server invalidation after migrating `next/cache`.
 * Wire the same instance through your router root / TanStack Query provider.
 * Prefer query keys prefixed `['next-cache', 'tag', …]` / `['next-cache', 'path', …]`
 * to line up with `invalidateQueries` emitted by the R4e codemod.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
    },
  },
})
