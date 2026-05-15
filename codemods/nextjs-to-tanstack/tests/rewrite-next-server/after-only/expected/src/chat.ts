// TODO: next/server `after` / `connection` — minimal Promise shims; verify semantics vs Next (logging, dynamic rendering) — https://tanstack.com/start/latest/docs/framework/react/guide/server-routes

const after = (cb: () => unknown) => { void Promise.resolve().then(cb); };

export function run() {
  after(() => {
    console.log("later");
  });
}
