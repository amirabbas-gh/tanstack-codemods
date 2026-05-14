import { createFileRoute } from "@tanstack/react-router";

function PostsCatchAll() {
  const { _splat } = Route.useParams();
  const segments = _splat.split("/").filter(Boolean);
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
