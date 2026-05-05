import { createFileRoute } from "@tanstack/react-router";

function Demo() {
  return <p>demo</p>;
}

export const Route = createFileRoute("/demo")({
  component: Demo,
});
