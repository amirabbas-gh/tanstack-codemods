import { createFileRoute } from "@tanstack/react-router";

function PostsPage() {
  return <div>posts list</div>;
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});
