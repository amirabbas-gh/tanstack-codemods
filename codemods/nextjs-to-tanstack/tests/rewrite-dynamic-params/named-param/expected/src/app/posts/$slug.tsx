import { createFileRoute } from "@tanstack/react-router";

function PostPage() {
  const { slug } = Route.useParams();
  return <div>My Post: {slug}</div>;
}

export const Route = createFileRoute("/posts/$slug")({
  component: PostPage,
});
