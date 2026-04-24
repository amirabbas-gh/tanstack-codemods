import { createFileRoute } from "@tanstack/react-router";

function AboutPage() {
  return <main>about</main>;
}

export const Route = createFileRoute("/about")({
  component: AboutPage,
});
