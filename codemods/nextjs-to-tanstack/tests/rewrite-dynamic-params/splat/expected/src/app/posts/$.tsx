import { createFileRoute } from "@tanstack/react-router";

function PostsCatchAll() {
  // CODEMOD: review — catch-all: renamed "slug" → "_splat"; note that _splat is a slash-joined string, not an array — update downstream usages
  const { _splat } = Route.useParams();
  return <div>Catch: {slug.join("/")}</div>;
}

export const Route = createFileRoute("/posts/$")({
  component: PostsCatchAll,
});
