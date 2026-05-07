import type { Metadata, Viewport } from "next";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "./globals.css?url";

export const metadata: Metadata = {
  title: "App",
};

export const viewport: Viewport = {
  themeColor: "#181818",
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
