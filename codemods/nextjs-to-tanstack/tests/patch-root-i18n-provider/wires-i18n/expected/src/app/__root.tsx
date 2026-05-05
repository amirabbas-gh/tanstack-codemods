import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

export const Route = createRootRoute({ component: Root });

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nextProvider i18n={i18n}><Outlet /></I18nextProvider>
        <Scripts />
      </body>
    </html>
  );
}
