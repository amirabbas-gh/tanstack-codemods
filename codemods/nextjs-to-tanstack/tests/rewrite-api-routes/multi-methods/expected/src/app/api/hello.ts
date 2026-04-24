import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/hello")({
  server: {
    handlers: {
      GET: async (req: Request) => {
        return Response.json({ hello: "world" });
      },
      POST: async (req: Request) => {
        const body = await req.json();
        return Response.json({ ok: true, body });
      },
      DELETE: async () => {
        return new Response(null, { status: 204 });
      },
    },
  },
});

