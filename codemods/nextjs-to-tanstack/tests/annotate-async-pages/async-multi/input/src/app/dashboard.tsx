import { createFileRoute } from "@tanstack/react-router";

async function DashboardPage() {
  const a = await fetch("/api/a").then((r) => r.json());
  const b = await fetch("/api/b").then((r) => r.json());
  return (
    <div>
      <p>{a.title}</p>
      <p>{b.title}</p>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
