import { createFileRoute } from "@tanstack/react-router";

function PostsPage() {
  const { x } = Route.useLoaderData();
  return <main />;
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,
,
  loader: async () => {
    return { x: 1 };
  },
});
