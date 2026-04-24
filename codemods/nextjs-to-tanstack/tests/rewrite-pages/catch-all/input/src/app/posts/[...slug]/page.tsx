export default async function PostsCatchAll({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <div>Catch: {slug.join("/")}</div>;
}
