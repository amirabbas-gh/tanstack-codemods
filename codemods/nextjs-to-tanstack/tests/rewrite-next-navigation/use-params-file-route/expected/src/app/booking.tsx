import { createFileRoute } from "@tanstack/react-router";
import { useParams, useLocation } from "@tanstack/react-router";


export const Route = createFileRoute("/booking")({
  component: Page,
});

function Page() {
  void useParams();
  void useLocation().pathname;
  return null;
}
