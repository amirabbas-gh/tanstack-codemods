// TODO: Next.js middleware has no drop-in in TanStack Start — port request/auth logic to server routes or server functions — https://tanstack.com/start/latest/docs/framework/react/guide/server-routes
import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}
