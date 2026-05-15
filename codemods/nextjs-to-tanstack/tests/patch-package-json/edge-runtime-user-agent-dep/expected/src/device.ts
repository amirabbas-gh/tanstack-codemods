import { userAgent } from "@edge-runtime/user-agent";

export function parse(req: Request) {
  return userAgent(req).browser;
}
