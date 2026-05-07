"use client";

import { useRouter } from "next/navigation";

export function Go(props: { row: { key: string } }) {
  const router = useRouter();
  return () => router.push(`/row/${props.row.key}`);
}
