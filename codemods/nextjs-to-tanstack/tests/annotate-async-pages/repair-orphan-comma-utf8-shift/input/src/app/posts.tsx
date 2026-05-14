import { createFileRoute } from "@tanstack/react-router";

/** Non-ASCII padding so UTF-8 byte offsets diverge from JS UTF-16 indices before the route block. */
const _utf8RegressionPad = "🚀".repeat(200);

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
