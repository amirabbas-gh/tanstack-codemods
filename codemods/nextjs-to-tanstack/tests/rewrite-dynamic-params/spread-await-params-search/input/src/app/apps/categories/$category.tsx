import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

const schema = z.object({ category: z.string(), q: z.string().optional() });

async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const parsed = schema.safeParse({ ...(await params), ...(await searchParams) });
  if (!parsed.success) return null;
  return <div>{parsed.data.category}</div>;
}

export const Route = createFileRoute("/apps/categories/$category")({
  component: Page,
});
