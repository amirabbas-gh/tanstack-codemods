import { userAgent, after } from "next/server";

export function GET(req: Request) {
  after(() => {});
  return Response.json({ browser: userAgent(req).browser });
}
