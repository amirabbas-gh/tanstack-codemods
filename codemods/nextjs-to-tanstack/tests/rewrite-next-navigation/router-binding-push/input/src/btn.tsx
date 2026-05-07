"use client";

import { useRouter } from "next/navigation";

export function Btn() {
  const router = useRouter();
  return () => router.push("/about");
}
