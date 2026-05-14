import { createFileRoute } from "@tanstack/react-router";

async function PostsPage() {
  const res = await fetch("https://api.vercel.app/blog");
  const posts = await res.json();
  return <ul>{posts.length}</ul>;
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});
