
// TODO: next/server migration (R4h): confirm `Request`/`Response` types match your runtime; port remaining `next/server` helpers — https://tanstack.com/start/latest/docs/framework/react/guide/server-routes

export function GET(req: Request) {
  return Response.json({ ok: true });
}
