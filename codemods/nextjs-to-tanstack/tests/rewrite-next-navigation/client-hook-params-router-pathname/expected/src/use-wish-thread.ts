"use client";

import { useCallback, useMemo } from "react";


// TODO: next/navigation migration (R4g): use `throw redirect()` in loaders / beforeLoad — client nav: `useNavigate()` — https://tanstack.com/router/latest/docs/framework/react/guide/navigation
import { useParams, useNavigate, useLocation } from "@tanstack/react-router";


export function useWishThread() {
  const params = useParams();
  const router = useNavigate();
  const pathname = useLocation().pathname;

  const threadId = useMemo(() => {
    const id = params.id as string | undefined;
    return id;
  }, [params.id]);

  const isOnWishHomePage = pathname === "/wish";

  const navigateToThread = useCallback(
    (id: string) => {
      if (isOnWishHomePage) {
        router({ to: "/wish/$id", params: { id }, search: { new: true } });
      } else {
        router({ to: "/wish/$id", params: { id } });
      }
    },
    [router, isOnWishHomePage],
  );

  return {
    threadId,
    navigateToThread,
  };
}
