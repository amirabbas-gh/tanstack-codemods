import { unstable_noStore } from "next/cache";

export function q(): number {
  unstable_noStore();
  return 1;
}
