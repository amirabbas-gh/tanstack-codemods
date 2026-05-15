// TODO: next/server `after` / `connection` — minimal Promise shims; verify semantics vs Next (logging, dynamic rendering) — https://tanstack.com/start/latest/docs/framework/react/guide/server-routes

async function connection(): Promise<void> {}

export async function Page() {
  await connection();
  return null;
}
