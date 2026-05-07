import { redirect } from "next/navigation";

export async function guard() {
  redirect("/login");
}
