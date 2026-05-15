# TanStack Start — manual follow-up

**nextjs-to-tanstack** — full walkthrough: [Migrate from Next.js](https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js).

## i18n (`/{-$locale}/…`)

Next `i18n`: **`src/app/{-$locale}/**`**, IDs use optional **`/{-$locale}`** — [Router i18n](https://tanstack.com/router/latest/docs/guide/internationalization-i18n). With **`.codemod/i18n.json`**: may emit **`src/i18n.ts`**, **`I18nextProvider`** on **`__root.tsx`**, **`import "./i18n"`** in **`router.tsx`** (replaces **next-i18next** / `serverSideTranslations`). Sync locale (`Route.useParams().locale`, `rewrite`, [Paraglide](https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide)); fix **`Link`**/`to` after **`vite dev`**.

## Next → TanStack (Start)

| Next | TanStack |
| --- | --- |
| `next/navigation`, routers | `useNavigate` / `useRouter` / `useLocation` / `useSearch`, loaders; `throw redirect()`; skipped for odd `useRouter` members |
| `router.refresh()` | `router.invalidate()` (R4b) |
| `notFound()` | `throw notFound()` |
| `middleware` / edge | `beforeLoad`, context, proxy/worker |
| `NEXT_PUBLIC_*` | `VITE_*`, `import.meta.env` (R13: `vite/client`) |
| `next/types`, pages, data APIs | `loader` + `Route.use*`; optional `FileRoutesByPath` ↓ |

**`opengraph-image.tsx` / `twitter-image.tsx` (R4i-bis):** rewritten to `createFileRoute` `server.handlers.GET` (e.g. `/posts/$slug/opengraph`). Add `og:image` / `twitter:image` in each route's `head()` pointing at the **absolute** URL for that path (site origin + path, or derived from `request.url` in a loader when generating metadata).

**`next/types`:** drop injected props; use `createFileRoute` `loader` + `validateSearch` + `Route.useLoaderData`/`useParams`/`useSearch`. **Pages:** no `NextPage`/`PageProps`. **`AppProps`:** `createRootRouteWithContext` + `context` ([guide](https://tanstack.com/router/latest/docs/framework/react/guide/router-context)). **GSSP/GSP/Infer*:** one `loader`, `useLoaderData`, `throw notFound()`. **`getStaticPaths`:** prerender +/`loader`. **API route types:** server routes / `createServerFn` / Hono. **Metadata:** route `head`, `__root` defaults. **Middleware:** `beforeLoad` + host edge.

```ts
import type { FileRoutesByPath } from '@tanstack/react-router'
type Blog = FileRoutesByPath['/blog/$slug']['types']
// Blog['allParams'] | ['fullSearchSchema'] | ['loaderData']
```

**R2/R3:** file `$segments` = URL shape (not `/src/app`); `Route.useParams` / `useSearch`; splat `$.tsx` → `_splat` ([splat](https://tanstack.com/router/latest/docs/framework/react/routing/routing-concepts#splat--catch-all-routes)).

**R4h:** `next/server` → Fetch primitives (`NextRequest`/`NextResponse`/`NextURL` → `Request`/`Response`/`URL`, `req.nextUrl` → `new URL(req.url)`, `NextResponse.rewrite` → `Response.redirect`); `userAgent`/`userAgentFromString` → `@edge-runtime/user-agent`; `ImageResponse` → `next/og` then **R4i**; `URLPattern` import dropped (global); `after`/`connection` → local shims + TODO; common middleware-related **types** → `unknown` stubs + TODO. Vitest middleware tests get Fetch shims (**R4h-bis**). Still manual: `NextResponse.next`, `import * as … from "next/server"`, aliases on Next*, uncommon exports — [server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).

## `// TODO:` markers (`rg '// TODO:'`)

- **R10** — `await`→`loader` or leave TODO — [data loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
- **R10a / R4j** — erased `next/*` types → `any`; fix **(R4j)**
- **R10b** — each surviving `from "next/…"` + middleware file note
- **R4e** **(R4e)** `next/cache` → TanStack Query — `revalidateTag`/`revalidatePath` emit `invalidateQueries` with `['next-cache', 'tag'|'path', …]` keys; unwrap `unstable_cache`/`cache` — [invalidate](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation), [caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching), [overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- **R4f** **(R4f)** `cookies`/`headers` → `getCookie`/`setCookie`/`deleteCookie`/`getCookies`/`getHeaders` (`@tanstack/start/server`); shims + survivors — [server fns](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- **R4g** **(R4g)** `redirect`/`notFound`/`useRouter` → throws in loaders; client `useNavigate` — [nav](https://tanstack.com/router/latest/docs/framework/react/guide/navigation)
- **R4i** **(R4i)** `next/og` / `ImageResponse` — **R4i** emits `satori` + `@resvg/resvg-js` + PNG `Response` (fonts / edge cases may need manual follow-up)
- **R4i-bis** **(R4i-bis)** `opengraph-image` / `twitter-image` files → `server.handlers.GET`; wire `og:image` URLs in `head()`
- **R4c-head** **(R4c-head)** `<Head>` fragments → Start `head`
- **R4c** **(R4c)** `dynamic` → `React.lazy` + `<Suspense>`
- **R4dist** **(R4dist)** `next/dist`, `ApiError`, `path-to-regexp`, codegen

Finish or delete each TODO. **R4c**/**R4dist** cover most `dynamic`/`script`; leftover `next/*` → **R10b**.

## Install, run, review

Install deps; **R11** only changes **`package.json`** — run a **normal** install (**not** `npm ci`/frozen lock until locks refresh). Re-home packages that peer **next**. **`vite dev`** / **`npm run dev`**.

Re-check **`head`** vs `metadata`, monorepo **`-t`**, `next/navigation` call sites need **`@tanstack/react-router`**, ESLint/CI/jsonc, and **`migrated-from-pages/`** cleanup.

## 4. Migration run summary

From `codemod:workflow` **state**: R10 / R10b totals, per-step JSON (`acquireLock` / `setState` / `getState`), and CLI **metrics** (`useMetricAtom` in R10 / R10b).

- **Package root (this manifest):** `.`

### Step reports (workflow state)

*No step reports in workflow state for this package (normal when only this script runs, or earlier steps did not persist a report).*

### R10 — async route components (loader migration + `// TODO: … Route.loader …` when needed)

*No R10 state for this package in this run.*

Metric **`nextjs-to-tanstack-r10-async-await`** (CLI + below):

*No entries in this run.*

### R10b — remaining `next/*` imports (per-line TODOs + middleware)

*No R10b state for this package in this run.*

Metric **`nextjs-to-tanstack-r10b-next-import`** (CLI + below):

*No entries in this run.*

## Reference links

[Migrate from Next.js](https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js) · [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) · [Query caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching) · [Router routing](https://tanstack.com/router/latest/docs/framework/react/routing/routing-concepts) · [Server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes) · [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
