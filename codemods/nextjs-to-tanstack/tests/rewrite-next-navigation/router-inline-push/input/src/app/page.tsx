"use client";

import { useRouter } from "next/navigation";

export default function P() {
  const onX = () => useRouter().push("/dash");
  return onX;
}
