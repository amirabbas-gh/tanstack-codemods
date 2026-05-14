import { createFileRoute } from "@tanstack/react-router";

async function PostsPage() {
  const data = await fetch("https://api.vercel.app/blog");
  const posts = await data.json();
  console.log(posts);
  const newFetch = await fetch("https://api.vercel.app/blog");
  console.log(await newFetch.json());

  return (
    <main>
      <p>{String(posts.length)}</p>
    </main>
  );
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});
