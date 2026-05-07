import { createFileRoute } from "@tanstack/react-router";

export async function generateViewport(): Promise<{ themeColor: string }> {
  return { themeColor: "#000" };
}

export const viewport = {
  width: "device-width",
};

function Products() {
  return <div>products</div>;
}

export const Route = createFileRoute("/products")({
  component: Products,
});
