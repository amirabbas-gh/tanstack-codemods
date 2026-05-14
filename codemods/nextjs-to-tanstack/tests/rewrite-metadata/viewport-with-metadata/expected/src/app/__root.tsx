import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "./globals.css?url";

export const Route = createRootRoute({
    head: () => ({
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }, { name: "theme-color", content: "#181818" }, { title: "App" }],
      links: [{ rel: "stylesheet", href: appCss }],
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
