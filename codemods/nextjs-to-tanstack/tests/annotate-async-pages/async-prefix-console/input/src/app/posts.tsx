import { createFileRoute } from "@tanstack/react-router";

async function PostsPage() {
  const data = await fetch("https://api.vercel.app/blog");
  const posts = await data.json();
  console.log(posts);

  return <main>ok</main>;
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});
