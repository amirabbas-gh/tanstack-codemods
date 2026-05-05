import { createFileRoute } from "@tanstack/react-router";

function X() {
  return null;
}

export const Route = createFileRoute("/dummy")({
  component: X,
});

// orphan tail that would break the parser
{ invalid junk after route }
