import { createFileRoute } from "@tanstack/react-router";

function PostsPage() {
  const { data, posts, newFetch } = Route.useLoaderData();

  return (
    <main>
      <p>{String(posts.length)}</p>
    </main>
  );
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,

  loader: async () => {
    const data = await fetch("https://api.vercel.app/blog");
    const posts = await data.json();
    console.log(posts);
    const newFetch = await fetch("https://api.vercel.app/blog");
    console.log(await newFetch.json());
    return { data, posts, newFetch };
  },
});
