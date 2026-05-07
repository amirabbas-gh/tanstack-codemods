"use client";

import { useCallback, useMemo } from "react";

import { useParams, useRouter, usePathname } from "next/navigation";

export function useWishThread() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const threadId = useMemo(() => {
    const id = params.id as string | undefined;
    return id;
  }, [params.id]);

  const isOnWishHomePage = pathname === "/wish";

  const navigateToThread = useCallback(
    (id: string) => {
      if (isOnWishHomePage) {
        router.push(`/wish/${id}?new`);
      } else {
        router.push(`/wish/${id}`);
      }
    },
    [router, isOnWishHomePage],
  );

  return {
    threadId,
    navigateToThread,
  };
}
