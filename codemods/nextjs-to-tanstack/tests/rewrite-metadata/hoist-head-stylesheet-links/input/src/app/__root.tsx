import type { Metadata } from "next";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "./globals.css?url";

export const metadata: Metadata = {
  title: "TanStack Start Starter",
};

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
