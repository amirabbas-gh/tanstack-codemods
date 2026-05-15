import { userAgent } from "@edge-runtime/user-agent";

export function GET(req: Request) {
  const ua = userAgent(req);
  return Response.json({ browser: ua.browser });
}
