"use client";

import { useTranslation } from "next-i18next";

/** Regression: non-ASCII in template literals must not corrupt full-buffer apply. */
const FOOTER_LABEL = "social";

export function FooterLike() {
  const { t } = useTranslation("common");
  return (
    <footer>
      <span>{FOOTER_LABEL}</span>
      <span>← {t("footer.back")}</span>
    </footer>
  );
}
