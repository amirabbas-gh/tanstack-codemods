import type { Viewport } from "next";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "./globals.css?url";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  userScalable: false,
  maximumScale: 1,
  minimumScale: 1,
};

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
