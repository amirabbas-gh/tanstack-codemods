"use client";

import { useTranslation } from "next-i18next";

export function Menu() {
  const { t } = useTranslation("common");
  return <nav>{t("home")}</nav>;
}
