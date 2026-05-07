import { ImageResponse } from "@vercel/og";

export async function GET() {
  return new ImageResponse(<div>Hi</div>);
}
