import { getPostBySlug } from "../posts-data";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <div>{getPostBySlug(slug)}</div>;
}
