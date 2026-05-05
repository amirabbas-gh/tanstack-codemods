import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

const paramsSchema = z.object({
  slug: z.string(),
});

async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = paramsSchema.safeParse(await params);
  if (!p.success) return null;
  return <div>{p.data.slug}</div>;
}

export const Route = createFileRoute("/apps/$slug")({
  component: Page,
});
