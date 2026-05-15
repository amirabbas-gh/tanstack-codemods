import { userAgent } from "@edge-runtime/user-agent";

// TODO: next/server `after` / `connection` — minimal Promise shims; verify semantics vs Next (logging, dynamic rendering) — https://tanstack.com/start/latest/docs/framework/react/guide/server-routes

const after = (cb: () => unknown) => { void Promise.resolve().then(cb); };

export function GET(req: Request) {
  after(() => {});
  return Response.json({ browser: userAgent(req).browser });
}
