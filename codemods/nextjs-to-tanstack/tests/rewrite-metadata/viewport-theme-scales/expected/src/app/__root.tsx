import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "./globals.css?url";

export const Route = createRootRoute({
    head: () => ({
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" }, { name: "theme-color", content: "white", media: "(prefers-color-scheme: light)" }, { name: "theme-color", content: "black", media: "(prefers-color-scheme: dark)" }],
    }),
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
