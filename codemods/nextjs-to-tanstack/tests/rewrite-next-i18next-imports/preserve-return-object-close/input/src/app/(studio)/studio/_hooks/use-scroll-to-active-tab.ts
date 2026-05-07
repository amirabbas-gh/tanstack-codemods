import { useEffect, useRef } from "react";

export const useScrollToActiveTab = (selectedTabId: string | null) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!selectedTabId || !viewportRef.current) return;

    const tabElement = tabRefs.current[selectedTabId];
    const viewport = viewportRef.current;

    if (tabElement) {
      const stickyWidth = 48;

      const { left: tabLeft, right: tabRight } = tabElement.getBoundingClientRect();
      const { left: viewportLeft, right: viewportRight } = viewport.getBoundingClientRect();

      const adjustedViewportLeft = viewportLeft + stickyWidth;

      if (tabLeft < adjustedViewportLeft || tabRight > viewportRight) {
        tabElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [selectedTabId]);

  return {
    viewportRef,

    registerTabRef: (id: string, el: HTMLButtonElement | null) => {
      if (el) tabRefs.current[id] = el;
    },
  };
};
