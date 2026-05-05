import { createFileRoute } from "@tanstack/react-router";

// TODO: move async data fetching into Route.loader (or a server function); avoid heavy awaits in route components — https://tanstack.com/router/latest/docs/framework/react/guide/data-loading
async function PostsPage() {
  const res = await fetch("https://api.vercel.app/blog");
  const posts = await res.json();
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
});
