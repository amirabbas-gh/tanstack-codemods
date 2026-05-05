import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";

function Page() {
  const { t } = useTranslation("common");


  useEffect(() => {
    document.title = [t("a"), t("b")].join(" - ");
  }, [t]);
  return (
    <>
      <p>hi</p>
    </>
  );
}

export const Route = createFileRoute("/products/widget")({
  component: Page,
});
