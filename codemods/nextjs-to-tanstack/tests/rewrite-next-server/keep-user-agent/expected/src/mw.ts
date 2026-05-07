
// TODO: next/server migration (R4h): confirm `Request`/`Response` types match your runtime; port remaining `next/server` helpers — https://tanstack.com/start/latest/docs/framework/react/guide/server-routes
import { userAgent } from "next/server";

export function GET(req: Request) {
  const ua = userAgent(req);
  return Response.json({ browser: ua.browser });
}
