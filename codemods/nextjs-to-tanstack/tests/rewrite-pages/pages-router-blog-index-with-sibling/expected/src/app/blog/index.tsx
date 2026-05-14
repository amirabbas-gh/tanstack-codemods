import { createFileRoute } from "@tanstack/react-router";

function BlogIndex() {
  return <div>blog index</div>;
}

export const Route = createFileRoute("/blog")({
  component: BlogIndex,
});
