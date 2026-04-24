/**
 * Replacement for the finalize-cleanup shell node.
 *
 * Removes `.codemod/state.json` after every patching step has consumed it.
 * Anchored to `package.json` so the trigger is stable, and conservative:
 * it only unlinks the specific sidecar file to avoid reaching beyond the
 * codemod's own scratch area.
 */

import type { Codemod } from "codemod:ast-grep";
import type JSON_TYPES from "codemod:ast-grep/langs/json";
import { rmSync } from "fs";
import { dirname, join } from "path";
import { getFilename } from "../utils/paths.ts";

const codemod: Codemod<JSON_TYPES> = async (root) => {
  const file = getFilename(root);
  if (!file.endsWith("/package.json") && !file.endsWith("package.json")) {
    return null;
  }

  const repoRoot = dirname(file);
  const stateDir = join(repoRoot, ".codemod");
  try {
    rmSync(stateDir, { recursive: true, force: true });
  } catch {
    // Already absent — fine.
  }
  return null;
};

export default codemod;
