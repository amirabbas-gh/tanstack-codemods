import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createFileRoute } from "@tanstack/react-router";
import { getPostBySlug } from "../../posts-data";

export const size = { width: 1200, height: 630 };

export const Route = createFileRoute("/posts/$slug/opengraph")({
  server: {
    handlers: {
      GET: async ({ params }: { params: Record<string, string> }) => {
        const { slug } = params;
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
      },
    },
  },
});
