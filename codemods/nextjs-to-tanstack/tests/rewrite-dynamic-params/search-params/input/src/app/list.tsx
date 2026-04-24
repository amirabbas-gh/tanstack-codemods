import { createFileRoute } from "@tanstack/react-router";

async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ page: string; filter: string }>;
}) {
  const { page, filter } = await searchParams;
  return (
    <div>
      page: {page} / filter: {filter}
    </div>
  );
}

export const Route = createFileRoute("/list")({
  component: ListPage,
});
