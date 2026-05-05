// TODO: replace `next/headers` with TanStack Start server APIs, standard Request/Response, or server functions — https://tanstack.com/start/latest/docs/framework/react/guide/server-routes
import { cookies } from "next/headers";

export function readSession() {
  return cookies().get("session");
}
