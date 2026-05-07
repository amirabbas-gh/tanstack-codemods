
// TODO: next/cache migration (R4e): wire `queryClient` through QueryClientProvider or your app root; every `invalidateQueries({ queryKey })` must match a real `useQuery` key; former `unstable_cache` TTL/tags → `staleTime` / gcTime / loaders; if you relied on `unstable_noStore`, use `staleTime: 0` (or refetch) for that data — https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
import { queryClient } from "./query-client";


export async function bust() {
  queryClient.invalidateQueries({ queryKey: ["/dashboard"] });
}
