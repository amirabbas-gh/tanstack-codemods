import { createFileRoute } from "@tanstack/react-router";

async function PostsCatchAll({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  return (
    <div>
      <p>{segments.length} parts</p>
      <ul>
        {segments.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

export const Route = createFileRoute("/posts/$")({
  component: PostsCatchAll,
});
