import { createFileRoute } from "@tanstack/react-router";

function PostsPage() {
  const { res, posts } = Route.useLoaderData();
  return <ul>{posts.length}</ul>;
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,

  loader: async () => {
    const res = await fetch("https://api.vercel.app/blog");
    const posts = await res.json();
    return { res, posts };
  },
});
