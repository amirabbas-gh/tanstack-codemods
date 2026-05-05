"use client";

import { useTranslation } from "react-i18next";

export function Menu() {
  const { t } = useTranslation("common");
  return <nav>{t("home")}</nav>;
}
