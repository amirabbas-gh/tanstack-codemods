import { cookies, draftMode } from "next/headers";

export async function maybePreview() {
  const draft = await draftMode();
  const sid = cookies().get("session");
  return { preview: draft.isEnabled, sid };
}
