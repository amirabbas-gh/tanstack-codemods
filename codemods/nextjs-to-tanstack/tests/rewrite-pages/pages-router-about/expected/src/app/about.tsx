import { createFileRoute } from "@tanstack/react-router";

function AboutPage() {
  return <div>about</div>;
}

export const Route = createFileRoute("/about")({
  component: AboutPage,
});
