import { headers } from "next/headers";

export function userAgent() {
  return headers().get("user-agent");
}
