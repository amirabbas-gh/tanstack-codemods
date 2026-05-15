import { cache } from "next/cache";

export const load = cache(async () => ({ ok: true }));
