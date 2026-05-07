import { revalidateTag as bump } from "next/cache";

export async function refresh() {
  bump("posts");
}
