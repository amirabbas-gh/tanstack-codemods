import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/list")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => {
        const query = Object.fromEntries(new URL(request.url).searchParams);
        const { page = "1", limit = "10", search } = query;

          return Response.json({
            page,
            limit,
            search: search ?? null,
            ok: true,
          }, { status: 200 });
      },
    },
  },
});
