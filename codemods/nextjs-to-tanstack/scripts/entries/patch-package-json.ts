/**
 * R11 — Patch `package.json`.
 *
 * Runs on exactly one file (`package.json`) with `language: json`. JSON has
 * no comments to preserve, so we take the simple-and-safe route of
 * parse → mutate → stringify via the standard library. The `.codemod/state.json`
 * sidecar is consulted for font dependencies written by R9.
 *
 * Skips package.json files that do not depend on `next` (so monorepo runs
 * using `** /package.json` globs skip unrelated workspaces).
 *
 * `next` is **always** removed from the manifest once TanStack deps are added.
 * Packages such as `next-auth` or `next-i18next` may remain until you replace
 * them with framework-agnostic or TanStack-oriented alternatives; they no longer
 * keep `next` installed.
 *
 * Mutations:
 *   - dependencies: remove `next`, `@tailwindcss/postcss`, and
 *     `eslint-config-next` / `@next/eslint-plugin-next` (from either bucket);
 *     ensure TanStack Start deps (`@tanstack/react-router`, `@tanstack/react-start`,
 *     `vite`, `@vitejs/plugin-react`, `nitro`, `@unpic/react`) exist at `"latest"` unless
 *     already present with a different version.
 *   - devDependencies: ensure `@tailwindcss/vite` and `tailwindcss` exist.
 *     For each **Google** sidecar font (`next/font/google`), add
 *     `@fontsource-variable/<packageKey>` at `"latest"`.
 *     `next/font/local` is skipped — those files are not on the registry.
 *   - scripts: replace any `dev`/`build`/`start` script that invokes `next` with
 *     the TanStack equivalent. Other scripts are untouched.
 *   - top level: ensure `"type": "module"`.
 */

import type { Codemod } from "codemod:ast-grep";
import type JSON_TYPES from "codemod:ast-grep/langs/json";
import { emitWorkflowStepReport, WORKFLOW_NODE_IDS } from "../utils/migration-run-report.ts";
import { getFilename, normalizePath } from "../utils/paths.ts";
import { hasFontsourcePackage, readSidecar } from "../utils/sidecar.ts";

interface PackageJson {
  name?: string;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const RUNTIME_DEPS: Array<[string, string]> = [
  ["@tanstack/react-router", "latest"],
  ["@tanstack/react-start", "latest"],
  ["vite", "latest"],
  ["@vitejs/plugin-react", "latest"],
  ["nitro", "latest"],
  ["@unpic/react", "latest"],
];

const DEV_DEPS: Array<[string, string]> = [
  ["@tailwindcss/vite", "latest"],
  ["tailwindcss", "latest"],
];

const codemod: Codemod<JSON_TYPES> = async (root) => {
  const file = getFilename(root);
  if (!file.endsWith("/package.json") && !file.endsWith("package.json")) {
    return null;
  }

  const rootNode = root.root();
  const source = rootNode.text();

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(source) as PackageJson;
  } catch {
    return null;
  }

  const before = JSON.stringify(pkg);

  // Monorepo runs may visit every package.json; only migrate Next.js apps.
  const hasNext = Boolean(pkg.dependencies?.next ?? pkg.devDependencies?.next);
  if (!hasNext) {
    return null;
  }

  const targetDirNorm = normalizePath(inferTargetDir(file));

  const emitReport = (manifestChanged: boolean): void => {
    emitWorkflowStepReport({
      step: WORKFLOW_NODE_IDS.patchPackageJson,
      packageRoot: targetDirNorm,
      packageName: typeof pkg.name === "string" ? pkg.name : undefined,
      manifestChanged,
      nextAdjacentDepsRemaining: collectNextAdjacentDeps(pkg),
    });
  };

  // Remove Next-specific deps (always — migrated apps do not keep `next`).
  deleteDep(pkg, "dependencies", "next");
  deleteDep(pkg, "dependencies", "@tailwindcss/postcss");
  deleteDep(pkg, "devDependencies", "next");
  deleteDep(pkg, "devDependencies", "@tailwindcss/postcss");
  deleteDep(pkg, "devDependencies", "eslint-config-next");
  deleteDep(pkg, "devDependencies", "@next/eslint-plugin-next");
  deleteDep(pkg, "dependencies", "eslint-config-next");
  deleteDep(pkg, "dependencies", "@next/eslint-plugin-next");

  // Ensure TanStack runtime deps.
  for (const [name, version] of RUNTIME_DEPS) {
    ensureDep(pkg, "dependencies", name, version);
  }

  // Ensure Tailwind devDeps.
  for (const [name, version] of DEV_DEPS) {
    ensureDep(pkg, "devDependencies", name, version);
  }

  // Fonts from the sidecar.
  const targetDir = inferTargetDir(file);
  const sidecar = readSidecar(targetDir);
  for (const font of sidecar.fonts) {
    if (!hasFontsourcePackage(font)) continue;
    ensureDep(pkg, "devDependencies", `@fontsource-variable/${font.packageKey}`, "latest");
  }

  // type: module.
  if (pkg.type !== "module") {
    pkg.type = "module";
  }

  // Scripts: `npm run dev` must run Vite + TanStack, not `next dev` (404).
  if (!pkg.scripts) pkg.scripts = {};
  const scripts = pkg.scripts;
  if (scripts.dev && /\bnext\b/.test(scripts.dev)) scripts.dev = "vite dev";
  if (scripts.build && /\bnext\b/.test(scripts.build)) scripts.build = "vite build";
  if (scripts.start && /\bnext\b/.test(scripts.start))
    scripts.start = "node .output/server/index.mjs";

  const after = JSON.stringify(pkg);
  if (after === before) {
    emitReport(false);
    return null;
  }

  // Sort key ordering: keep the original first key sequence to avoid noisy
  // diffs. JSON.parse preserves insertion order, and our ensureDep() appends
  // to the existing object, so ordering should be stable.

  const serialised = `${stringifyOrdered(pkg)}\n`;

  emitReport(true);

  return rootNode.commitEdits([
    {
      startPos: 0,
      endPos: source.length,
      insertedText: serialised,
    },
  ]);
};

export default codemod;

function deleteDep(
  pkg: PackageJson,
  bucket: "dependencies" | "devDependencies",
  name: string,
): void {
  const existing = pkg[bucket] as Record<string, string> | undefined;
  if (!existing) return;
  if (!(name in existing)) return;
  delete existing[name];
}

function ensureDep(
  pkg: PackageJson,
  bucket: "dependencies" | "devDependencies",
  name: string,
  version: string,
): void {
  if (!pkg[bucket]) pkg[bucket] = {};
  const existing = pkg[bucket] as Record<string, string>;
  if (!(name in existing)) {
    existing[name] = version;
  }
}

function stringifyOrdered(pkg: PackageJson): string {
  // Ensure predictable key ordering for reproducible diffs: top-level keys
  // follow a conventional order; unknown keys are preserved in the tail.
  const preferredOrder = [
    "name",
    "version",
    "description",
    "private",
    "type",
    "engines",
    "scripts",
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ];
  const seen = new Set<string>();
  const out: Record<string, unknown> = {};
  for (const key of preferredOrder) {
    if (key in pkg) {
      out[key] = pkg[key];
      seen.add(key);
    }
  }
  for (const key of Object.keys(pkg)) {
    if (!seen.has(key)) {
      out[key] = pkg[key];
    }
  }
  return JSON.stringify(out, null, 2);
}

function inferTargetDir(packageJsonPath: string): string {
  const idx = packageJsonPath.lastIndexOf("/");
  if (idx === -1) return ".";
  return packageJsonPath.slice(0, idx);
}

function collectNextAdjacentDeps(pkg: PackageJson): string[] {
  const names = new Set<string>();
  for (const bucket of [pkg.dependencies, pkg.devDependencies]) {
    if (!bucket) continue;
    for (const name of Object.keys(bucket)) {
      if (
        name.startsWith("next-") ||
        name.startsWith("@next/") ||
        name === "@sentry/nextjs"
      ) {
        names.add(name);
      }
    }
  }
  return [...names].sort();
}
