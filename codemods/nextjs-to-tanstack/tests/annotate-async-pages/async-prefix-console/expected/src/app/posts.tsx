import { createFileRoute } from "@tanstack/react-router";

function PostsPage() {
  const { data, posts } = Route.useLoaderData();

  return <main>ok</main>;
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,

  loader: async () => {
    const data = await fetch("https://api.vercel.app/blog");
    const posts = await data.json();
    console.log(posts);
    return { data, posts };
  },
});
