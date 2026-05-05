import { cookies } from "next/headers";

export function readSession() {
  return cookies().get("session");
}
