import { createFileRoute } from "@tanstack/react-router";
import { useParams, usePathname } from "next/navigation";

export const Route = createFileRoute("/booking")({
  component: Page,
});

function Page() {
  void useParams();
  void usePathname();
  return null;
}
