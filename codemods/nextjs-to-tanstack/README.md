# nextjs-to-tanstack

Automated migration from **Next.js** (App Router and common **Pages Router** patterns) to **TanStack Start** / **TanStack Router** file-based routes: it rewrites routes and API handlers, refreshes tooling, and writes a human checklist for what still needs attention.

## Quick start

```bash
# From the Codemod registry
npx codemod@latest run nextjs-to-tanstack

# Single package in a monorepo — scope the target directory
npx codemod@latest run nextjs-to-tanstack -t /path/to/next-app

# Run this package’s workflow locally (same -t semantics)
npx codemod@latest workflow run --workflow workflow.yaml --target .
```

Commit or back up your project before running. The workflow edits many files and may relocate leftovers under `migrated-from-pages/`.

## Workflow params

When running [`workflow.yaml`](workflow.yaml) directly, you can pass:

| Param | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enableAiFollowupFixups` | string (`"true"` / `"false"`) | `"false"` | After deterministic steps, runs an optional **AI** pass that tries to clear `// TODO:` markers and tasks listed in **`TANSTACK_MIGRATION_NEXT_STEPS.md`**. Enable only if you want that extra, non-deterministic step. |

Example:

```bash
npx codemod@latest workflow run --workflow workflow.yaml --target . \
  -p enableAiFollowupFixups=true
```

## What the migration does (high level)

1. **Scaffold** — Adds **Vite** / **TanStack Start** pieces (for example `vite.config.ts`, router entry) and may record i18n hints under `.codemod/` when Next i18n is detected.
2. **Remove Next-only root configs** — Deletes typical `next.config.*` and `postcss.config.*` files (replaced by the new stack).
3. **Structure** — Turns App/Pages layouts into **`__root.tsx`**, moves **API routes** and **`page`/`route` modules** into `createFileRoute` shape, handles **dynamic segments**, **loading/error/not-found/template** files, and trims empty Next segment folders.
4. **Semantics** — Rewrites **metadata** → **`head()`**, **params/searchParams** → **router hooks**, **`next/link` / `next/image`**, **`next/navigation`**, **`next/dynamic` / `next/script`**, **`next/cache`** toward **TanStack Query** patterns, **`next/headers`** toward **Start server helpers**, **`next/server`** toward **Fetch `Request`/`Response`**, **`next/og`** toward **satori + resvg**, and **OG/Twitter image routes** toward **server `GET` handlers**.
5. **Data & types** — Moves safe **top-level `await`** into **route loaders** where possible; strips **Pages data APIs** from migrated routes; normalizes **fonts** and **globals CSS**; scrubs **Next-only types** (often to placeholders you should refine).
6. **Housekeeping** — **TODO-comments** (`R10` / `R10b`) flag anything the codemod could not safely finish; **`package.json`** gets Start/Router/Vite-related deps and scripts; **tsconfig / ESLint / docs** references to Next are patched; leftover **`pages/`** may move to **`migrated-from-pages/`**; **`TANSTACK_MIGRATION_NEXT_STEPS.md`** is written beside the package **`package.json`**.
7. **Optional AI follow-up** — If enabled, an AI step attempts low-risk fixes from the guide and TODOs (see params above).
8. **Cleanup** — Removes transient codemod state files (for example `.codemod/state.json`).

Globs are written so nested trees like `apps/foo/app/...` match when you aim the workflow at the repo root—still, **` -t <next-package-root>`** is strongly recommended in large monorepos to limit scope and runtime.

## After you run

1. **Install dependencies** — **`package.json` is only edited** (step **R11**). Run your usual **install** (not necessarily **`npm ci`** until lockfiles are regenerated). Reconcile anything that still **peers** on **Next**.
2. **Read `TANSTACK_MIGRATION_NEXT_STEPS.md`** — It is the authoritative checklist for this run: **i18n**, **env vars** (`NEXT_PUBLIC_*` → **`VITE_*` / `import.meta.env`**), **OG image URLs**, **`// TODO:`** categories (**R10**, **R4e–R4i**, etc.), and links to [Migrate from Next.js](https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js).
3. **Search for leftovers** — e.g. `rg '// TODO:'`, remaining **`from "next/…"`** imports, **`middleware`**, and **`migrated-from-pages/`** (review, merge, then delete when done).
4. **Run the app** — **`vite dev`** or **`npm run dev`** from the migrated package; fix **navigation**, **loaders**, and **tests** (Vitest-related rewrites are partially automated — see the guide for **R4h-bis**).

The migration is **best-effort**: edge runtime, uncommon **Next** APIs, and project-specific architecture may still need manual work. Treat the generated guide and TODOs as your punch list.

## Development

```bash
npm test
codemod workflow validate --workflow workflow.yaml
codemod login && codemod publish
```

## Resources

- [Migrate from Next.js (TanStack Start)](https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js)
- [TanStack Router — routing concepts](https://tanstack.com/router/latest/docs/framework/react/routing/routing-concepts)
- [TanStack Start — server routes & functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes)

## License

MIT
