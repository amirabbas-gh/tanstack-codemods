import { createRootRoute } from "@tanstack/react-router";

export const metadata = {
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return <html />;
}
