import { Inter } from "next/font/google";
import { createRootRoute } from "@tanstack/react-router";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>hello</body>
    </html>
  );
}
