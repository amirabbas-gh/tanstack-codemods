import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import appCss from './globals.css?url';

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
