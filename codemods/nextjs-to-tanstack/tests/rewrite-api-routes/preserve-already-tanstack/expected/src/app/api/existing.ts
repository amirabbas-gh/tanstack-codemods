import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/existing")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true }),
    },
  },
});
