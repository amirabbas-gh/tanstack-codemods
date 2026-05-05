/**
 * Repair route modules after migration: keep only the first complete
 * `export const Route = createFileRoute(...)({ ... });` using string/template-aware
 * brace matching, strip known partial-SSG tails (`| "locale"...`, `{ return { props:` + …),
 * and run again so duplicate Route blocks / stray JSX after `});` (e.g. broken R2 output)
 * do not leave the generator with invalid TSX.
 *
 * Note: Plain `*.ts` server files are included so duplicate/junk tails after `});` are
 * removed; brace matching skips strings/templates but not regex literals — rare edge case.
 */

import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { readFileSync, writeFileSync } from "fs";
import { getFilename, normalizePath } from "../utils/paths.ts";
import {
  applyRepairRouteTailPipeline,
} from "../utils/strip-next-pages-data.ts";

const codemod: Codemod<TSX> = async (root) => {
  const file = normalizePath(getFilename(root));
  if (!isAppRouteModule(file)) return null;

  let source: string;
  try {
    source = readFileSync(file).toString();
  } catch {
    return null;
  }

  const next = applyRepairRouteTailPipeline(source);
  if (next === source) return null;

  writeFileSync(file, next);
  return next;
};

export default codemod;

function isAppRouteModule(file: string): boolean {
  return /(^|\/)src\/app\/.*\.(tsx|ts|jsx|js)$/.test(file) ||
    /(^|\/)app\/.*\.(tsx|ts|jsx|js)$/.test(file);
}
