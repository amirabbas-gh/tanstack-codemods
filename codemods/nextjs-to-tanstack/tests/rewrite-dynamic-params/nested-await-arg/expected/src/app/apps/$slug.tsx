import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

const paramsSchema = z.object({
  slug: z.string(),
});

function Page() {
  const p = paramsSchema.safeParse(Route.useParams());
  if (!p.success) return null;
  return <div>{p.data.slug}</div>;
}

export const Route = createFileRoute("/apps/$slug")({
  component: Page,
});
