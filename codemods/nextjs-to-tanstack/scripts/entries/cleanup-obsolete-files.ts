/**
 * Replacement for the cleanup-obsolete-files shell node.
 *
 * Iterates over `next.config.*` and `postcss.config.*` files at the repo
 * root and deletes them via the sandboxed `fs` module. The transform
 * returns `null` so the JSSG engine doesn't try to write any content back
 * to the (now absent) file.
 */

import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { rmSync } from "fs";
import { getFilename } from "../utils/paths.ts";

const OBSOLETE = /\/(next|postcss)\.config\.(js|mjs|cjs|ts|mts|cts)$/;

const codemod: Codemod<TSX> = async (root) => {
  const file = getFilename(root);
  if (!OBSOLETE.test(file)) return null;

  try {
    rmSync(file, { force: true });
  } catch {
    // Already gone, no-op.
  }
  return null;
};

export default codemod;
