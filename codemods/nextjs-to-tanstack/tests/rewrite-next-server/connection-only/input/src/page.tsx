import { connection } from "next/server";

export async function Page() {
  await connection();
  return null;
}
