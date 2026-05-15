export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q");
  return Response.json({ q });
}
