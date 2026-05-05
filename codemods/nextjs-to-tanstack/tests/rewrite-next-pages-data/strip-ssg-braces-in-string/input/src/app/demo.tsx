import type { GetStaticProps } from "next";
import { createFileRoute } from "@tanstack/react-router";

function Demo() {
  return <p>demo</p>;
}

export const Route = createFileRoute("/demo")({
  component: Demo,
});

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      pattern: "}",
      tpl: `hello {not a brace layer}`,
    },
  };
};
