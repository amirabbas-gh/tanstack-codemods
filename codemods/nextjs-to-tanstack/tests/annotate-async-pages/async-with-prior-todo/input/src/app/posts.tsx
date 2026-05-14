import { createFileRoute } from "@tanstack/react-router";

// TODO: move async data fetching into Route.loader (or a server function); avoid heavy awaits in route components - https://tanstack.com/router/latest/docs/framework/react/guide/data-loading
async function PostsPage() {
  const data = await fetch("https://api.vercel.app/blog");
  const posts = await data.json();
  console.log(posts);

  return <main>ok</main>;
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});
