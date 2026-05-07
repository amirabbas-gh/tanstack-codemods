
// TODO: next/headers migration (R4f): pass a real Web `Request` from TanStack Router / Start (`createRouter` context, server route, Nitro) — HTTP-only cookies stay server-side — https://tanstack.com/router/latest/docs/framework/react/guide/router-context
import { getCookieFromRequest } from "./next-headers-bridge";
import { draftMode } from "next/headers";


export async function maybePreview() {
  const draft = await draftMode();
  const sid = getCookieFromRequest(undefined, "session");
  return { preview: draft.isEnabled, sid };
}
