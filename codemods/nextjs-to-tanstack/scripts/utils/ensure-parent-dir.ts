/**
 * Ensure the parent directory exists before a codemod rename moves a file into
 * a flattened route path (TanStack colocates `page.tsx` into `segment.tsx`,
 * which must not fail with ENOENT).
 *
 * `pruneEmptyAncestorsAfterRename` removes now-empty folders (e.g. abandoned
 * `pages/...` / `app/.../segment` directories) up to the package root.
 *
 * Sandboxed workflow runners (e.g. QuickJS without Node `fs`) cannot call
 * `mkdirSync` / `readdirSync`; failures are swallowed so the host can
 * materialize paths when applying edits and renames.
 */

import { mkdirSync, readdirSync, rmdirSync } from "fs";
import { dirname } from "path";
import { inferCodemodTargetDir, normalizePath } from "./paths.ts";

export function ensureParentDir(absFilePath: string): void {
  const dir = dirname(absFilePath);
  if (dir === "." || dir === "/") return;
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* Host applies the rename and may create parents without Node fs in sandbox */
  }
}

/**
 * Walk upward from the **parent** of the file that was just moved/renamed and
 * remove each directory that ends up empty. Stops at the inferred package root
 * or when a non-empty directory is hit. Safe for monorepos (`-t package/`).
 */
export function pruneEmptyAncestorsAfterRename(previousFileAbsolute: string): void {
  try {
    const pkgRoot = normalizePath(inferCodemodTargetDir(previousFileAbsolute));
    let d = normalizePath(dirname(previousFileAbsolute));

    for (;;) {
      if (d === pkgRoot || !d.startsWith(`${pkgRoot}/`)) return;

      try {
        if (readdirSync(d).length > 0) return;
        rmdirSync(d);
      } catch {
        return;
      }

      const parent = normalizePath(dirname(d));
      if (parent === d) return;
      d = parent;
    }
  } catch {
    /* No Node fs in some runtimes */
  }
}
