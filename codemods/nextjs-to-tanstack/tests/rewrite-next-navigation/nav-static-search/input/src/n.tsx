"use client";

import { useRouter } from "next/navigation";

export function Go() {
  const router = useRouter();
  return () => router.push("/search?q=tanstack&live");
}
