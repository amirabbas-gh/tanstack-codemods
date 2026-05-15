import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

import { getPostBySlug } from "../../posts-data";

export const alt = "Post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return (await (async (): Promise<Response> => {
    const __ogSvg0 = await satori(
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <span>{post.title}</span>
      </div>,
      { ...size, fonts: [] },
    );
    const __ogPng0 = new Resvg(__ogSvg0).render().asPng();
    return new Response(__ogPng0, { headers: { "Content-Type": "image/png" } });
  })());
}
