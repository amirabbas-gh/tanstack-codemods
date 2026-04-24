import localFont from "next/font/local";
import { createRootRoute } from "@tanstack/react-router";

const geistMono = localFont({
  src: "./fonts/GeistMono-Regular.woff2",
  variable: "--font-mono",
});

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className={geistMono.variable}>
      <body>hi</body>
    </html>
  );
}
