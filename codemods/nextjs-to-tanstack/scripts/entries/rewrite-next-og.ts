/**
 * `next/og` re-exports Vercel OG primitives — point imports at `@vercel/og`.
 * Named exports are preserved (`ImageResponse`, etc.).
 *
 * R11 adds `@vercel/og` to `package.json` alongside other runtime deps.
 */

import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

const FROM_OG = "next/og";
const VERCEL_OG = "@vercel/og";

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const edits: Edit[] = [];

  for (const stmt of rootNode.findAll({ rule: { kind: "import_statement" } })) {
    const t = stmt.text();
    if (parseImportSource(t) !== FROM_OG) continue;
    const next = t.replace(
      new RegExp(`from\\s*["']${escapeRe(FROM_OG)}["']`, "g"),
      `from "${VERCEL_OG}"`,
    );
    if (next === t) continue;
    edits.push({
      startPos: stmt.range().start.index,
      endPos: stmt.range().end.index,
      insertedText: next,
    });
  }

  if (edits.length === 0) return null;
  edits.sort((a, b) => b.startPos - a.startPos);
  return rootNode.commitEdits(edits);
};

export default codemod;

function parseImportSource(s: string): string | null {
  const m = s.match(/from\s*["']([^"']+)["']/);
  return m?.[1] ?? null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
