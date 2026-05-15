import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  return NextResponse.json({ q });
}
