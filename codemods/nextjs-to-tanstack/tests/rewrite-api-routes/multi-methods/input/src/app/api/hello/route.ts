export async function GET(req: Request) {
  return Response.json({ hello: "world" });
}

export async function POST(req: Request) {
  const body = await req.json();
  return Response.json({ ok: true, body });
}

export async function DELETE() {
  return new Response(null, { status: 204 });
}
