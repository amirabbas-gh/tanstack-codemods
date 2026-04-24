import { createRootRoute } from "@tanstack/react-router";


export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <body>hi</body>
    </html>
  );
}
