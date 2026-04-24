import { createFileRoute } from "@tanstack/react-router";

async function PostsCatchAll({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <div>Catch: {slug.join("/")}</div>;
}

export const Route = createFileRoute("/posts/$")({
  component: PostsCatchAll,
});
