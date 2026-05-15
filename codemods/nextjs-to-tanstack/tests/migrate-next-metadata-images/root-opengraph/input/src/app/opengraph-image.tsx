import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const size = { width: 1200, height: 630 };
export const alt = "Site";
export const contentType = "image/png";

export default async function Image() {
  return (await (async (): Promise<Response> => {
    const __ogSvg0 = await satori(<div style={{ display: "flex" }}>OG</div>, {
      ...size,
      fonts: [],
    });
    const __ogPng0 = new Resvg(__ogSvg0).render().asPng();
    return new Response(__ogPng0, { headers: { "Content-Type": "image/png" } });
  })());
}
