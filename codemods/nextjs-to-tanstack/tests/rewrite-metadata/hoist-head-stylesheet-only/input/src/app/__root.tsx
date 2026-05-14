import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "./globals.css?url";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <link rel="stylesheet" href="https://example.com/theme.css" />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
