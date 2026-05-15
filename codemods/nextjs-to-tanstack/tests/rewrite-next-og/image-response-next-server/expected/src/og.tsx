import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export async function GET() {
  return (await (async (): Promise<Response> => {
    const __ogSvg0 = await satori(<div>Hi</div>, { width: 1200, height: 630, fonts: [] });
    const __ogPng0 = new Resvg(__ogSvg0).render().asPng();
    return new Response(__ogPng0, { headers: { "Content-Type": "image/png" } });
  })());
}
