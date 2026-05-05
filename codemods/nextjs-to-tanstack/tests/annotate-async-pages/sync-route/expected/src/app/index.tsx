import { createFileRoute } from "@tanstack/react-router";

function HomePage() {
  return <p>ok</p>;
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
