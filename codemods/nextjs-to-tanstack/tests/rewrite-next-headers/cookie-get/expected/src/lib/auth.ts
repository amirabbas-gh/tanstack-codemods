
// TODO: next/headers migration (R4f): pass a real Web `Request` from TanStack Router / Start (`createRouter` context, server route, Nitro) — HTTP-only cookies stay server-side — https://tanstack.com/router/latest/docs/framework/react/guide/router-context
import { getCookieFromRequest } from "../next-headers-bridge";


export function readSession() {
  return getCookieFromRequest(undefined, "session");
}
