import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

const schema = z.object({ category: z.string(), q: z.string().optional() });

function Page() {
  const parsed = schema.safeParse({ ...(Route.useParams()), ...(Route.useSearch()) });
  if (!parsed.success) return null;
  return <div>{parsed.data.category}</div>;
}

export const Route = createFileRoute("/apps/categories/$category")({
  component: Page,
});
