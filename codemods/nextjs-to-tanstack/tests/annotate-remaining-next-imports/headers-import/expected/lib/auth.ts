// TODO: remaining `next/headers` usage was not auto-ported (e.g. `draftMode`, `cookies().set`, `headers()` without `.get`) — wire Web `Request` from TanStack Router / Start context or server handlers — https://tanstack.com/router/latest/docs/framework/react/guide/router-context
import { cookies } from "next/headers";

export function readSession() {
  return cookies().get("session");
}
