import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "./globals.css?url";

export const Route = createRootRoute({
  component: MyApp,
});

function MyApp() {
  return (
    <Outlet />
  );
}
