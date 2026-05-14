import { createFileRoute } from "@tanstack/react-router";

async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <div>Post: {slug}</div>;
}

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPost,
});
