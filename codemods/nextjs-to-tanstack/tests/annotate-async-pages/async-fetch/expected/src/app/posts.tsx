import { createFileRoute } from "@tanstack/react-router";

function PostsPage() {
  const { res, posts } = Route.useLoaderData();
  return (
    <ul>
      {posts.map((post: { id: string; title: string }) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,

  loader: async () => {
    const res = await fetch("https://api.vercel.app/blog");
    const posts = await res.json();
    return { res, posts };
  },
});
