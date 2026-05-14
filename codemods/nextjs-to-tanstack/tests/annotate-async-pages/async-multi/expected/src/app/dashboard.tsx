import { createFileRoute } from "@tanstack/react-router";

function DashboardPage() {
  const { a, b } = Route.useLoaderData();
  return (
    <div>
      <p>{a.title}</p>
      <p>{b.title}</p>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,

  loader: async () => {
    const a = await fetch("/api/a").then((r) => r.json());
    const b = await fetch("/api/b").then((r) => r.json());
    return { a, b };
  },
});
