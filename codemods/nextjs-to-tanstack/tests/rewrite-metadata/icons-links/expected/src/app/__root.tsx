import { createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
    head: () => ({
      links: [{ rel: "icon", href: "/favicon.ico" }, { rel: "apple-touch-icon", href: "/apple-icon.png" }],
    }),
  component: RootLayout,
});

function RootLayout() {
  return <html />;
}
