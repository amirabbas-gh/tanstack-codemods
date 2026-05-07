import { cookies } from "next/headers";

export function token() {
  const c = cookies().get("token");
  return c?.value ?? null;
}
