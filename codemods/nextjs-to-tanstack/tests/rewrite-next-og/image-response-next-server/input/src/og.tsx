import { ImageResponse } from "next/server";

export async function GET() {
  return new ImageResponse(<div>Hi</div>);
}
