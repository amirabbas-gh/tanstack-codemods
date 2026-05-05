/**
 * Cross-cutting: `next-i18next` → `react-i18next` on all TS/JS sources so shared
 * components (e.g. `src/components/**`) are migrated, not only App Router files
 * covered by R10a.
 */

import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

import { applyNextI18nextToReactI18nextModuleRewrites } from "../utils/rewrite-next-i18next-specifiers.ts";
import { collapseDuplicateTrailingExportClosures } from "../utils/eof-closure-cleanup.ts";

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();
  const next = collapseDuplicateTrailingExportClosures(
    applyNextI18nextToReactI18nextModuleRewrites(source),
  );
  if (next === source) return null;
  return rootNode.commitEdits([
    { startPos: 0, endPos: source.length, insertedText: next },
  ]);
};

export default codemod;
