
// TODO: next/cache migration (R4e): unwrap + optional `*QueryOptions` for `useQuery`/`ensureQueryData`; align with `invalidateQueries` / route loaders — https://tanstack.com/query/latest/docs/framework/react/guides/caching · https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

export const load = async () => ({ ok: true });

export const loadQueryOptions = {
  queryKey: ['next-cache', 'load'] as const,
  queryFn: load,
};
