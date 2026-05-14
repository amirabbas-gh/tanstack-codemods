import { getPostBySlug } from "./posts-data";
import { createFileRoute } from '@tanstack/react-router';

async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <div>{getPostBySlug(slug)}</div>;
}

export const Route = createFileRoute("/posts/$slug")({
  component: PostPage,
});
