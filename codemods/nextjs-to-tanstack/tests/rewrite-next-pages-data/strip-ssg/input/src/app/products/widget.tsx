import type { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import Head from "next/head";
import { createFileRoute } from "@tanstack/react-router";

function Page() {
  const { t } = useTranslation("common");

  return (
    <>
      <Head>
        <title>
          {t("a")} - {t("b")}
        </title>
      </Head>
      <p>hi</p>
    </>
  );
}

export const Route = createFileRoute("/products/widget")({
  component: Page,
});

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || "fa", ["common"])),
    },
  };
};
