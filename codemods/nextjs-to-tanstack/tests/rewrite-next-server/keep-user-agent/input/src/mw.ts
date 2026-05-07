import { NextResponse, userAgent } from "next/server";

export function GET(req: Request) {
  const ua = userAgent(req);
  return NextResponse.json({ browser: ua.browser });
}
