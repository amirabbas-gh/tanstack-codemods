import { createFileRoute } from "@tanstack/react-router";

function ListPage() {
  const { page, filter } = Route.useSearch();
  return (
    <div>
      page: {page} / filter: {filter}
    </div>
  );
}

export const Route = createFileRoute("/list")({
  component: ListPage,
});
