import { createFileRoute } from "@tanstack/react-router";

// TODO [CODEMOD]: dynamic generateMetadata — port to head() with route loader data — https://tanstack.com/start/latest/docs/framework/react/guide/head
export async function generateMetadata(): Promise<{ title: string }> {
  const title = await fetchTitle();
  return { title };
}

async function fetchTitle() {
  return "hi";
}

function Products() {
  return <div>products</div>;
}

export const Route = createFileRoute("/products")({
  component: Products,
});
