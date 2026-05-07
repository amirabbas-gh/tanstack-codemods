import { cookies } from "next/headers";

export async function session() {
  return (await cookies()).get("session");
}
