import { unstable_cache } from "next/cache";

export const load = unstable_cache(async () => ({ ok: true }), ["items"], {
  tags: ["items"],
  revalidate: 60,
});
