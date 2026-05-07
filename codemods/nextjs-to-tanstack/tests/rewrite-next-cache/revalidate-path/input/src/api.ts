import { revalidatePath } from "next/cache";

export async function bust() {
  revalidatePath("/dashboard", "layout");
}
