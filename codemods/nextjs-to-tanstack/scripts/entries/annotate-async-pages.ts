/**
 * R10 — Tier-2 TODO for async Page components.
 *
 * Detects page component functions that are `async` AND contain a top-level
 * `await fetch(...)` or `await <identifier>(...)`. These are server-side
 * data fetching patterns that can't be safely collapsed into
 * `Route.loader` automatically (the await may be conditional, looped,
 * resource-scoped, etc.), so we leave the code untouched and prepend a
 * TODO comment.
 *
 * The script is idempotent: it skips any function that already has the
 * TODO sentinel on a preceding line.
 */

import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { getAppRelativePath } from "../utils/paths.ts";
import { hasTodoSentinel, insertTodoBefore } from "../utils/sentinels.ts";

const DATA_LOADER_DOC =
  "https://tanstack.com/start/latest/docs/framework/react/guide/data-loading";

const codemod: Codemod<TSX> = async (root) => {
  const relative = getAppRelativePath(root);
  // Never annotate the root layout.
  if (/__root\.tsx?$/.test(relative)) {
    return null;
  }

  const rootNode = root.root();
  const pageFn = findPageComponentFunction(rootNode);
  if (!pageFn) return null;

  const isAsync = pageFn.children().some((c) => c.kind() === "async");
  if (!isAsync) return null;

  // Require at least one top-level await expression to avoid spurious TODOs
  // on async components that only use awaits inside nested arrows.
  const body = pageFn.field("body");
  if (!body) return null;
  const hasTopLevelAwait = body.children().some((stmt) =>
    stmt.findAll({ rule: { kind: "await_expression" } }).some((aw) => {
      // Exclude awaits nested inside another function body.
      const inFn = aw
        .ancestors()
        .find((a) =>
          a.kind() === "function_declaration" ||
          a.kind() === "arrow_function" ||
          a.kind() === "function_expression",
        );
      return inFn?.id() === pageFn.id();
    }),
  );
  if (!hasTopLevelAwait) return null;

  const source = rootNode.text();
  const target = findPrependTarget(rootNode, pageFn);

  if (hasTodoSentinel(source, target, "async page to Route.loader")) {
    return null;
  }

  const edit = insertTodoBefore(
    target,
    "convert async page to Route.loader + Route.useLoaderData()",
    DATA_LOADER_DOC,
  );
  return rootNode.commitEdits([edit]);
};

export default codemod;

function findPageComponentFunction(rootNode: SgNode<TSX>): SgNode<TSX> | null {
  const pair = rootNode.find({
    rule: {
      kind: "pair",
      has: { field: "key", regex: "^component$" },
      inside: {
        stopBy: "end",
        kind: "call_expression",
        has: {
          field: "function",
          any: [
            { kind: "identifier", regex: "^createFileRoute$" },
            {
              kind: "call_expression",
              has: {
                field: "function",
                kind: "identifier",
                regex: "^createFileRoute$",
              },
            },
          ],
        },
      },
    },
  });
  if (!pair) return null;
  const valueNode = pair.field("value");
  if (!valueNode) return null;
  const componentName = valueNode.text();

  for (const child of rootNode.children()) {
    if (child.kind() === "function_declaration") {
      if (child.field("name")?.text() === componentName) return child;
    }
  }
  return null;
}

function findPrependTarget(rootNode: SgNode<TSX>, pageFn: SgNode<TSX>): SgNode<TSX> {
  // If the function is directly exported, hang the TODO on the export
  // statement so the marker doesn't land between `export` and the function.
  for (const child of rootNode.children()) {
    if (child.kind() !== "export_statement") continue;
    for (const inner of child.children()) {
      if (inner.id() === pageFn.id()) return child;
    }
  }
  return pageFn;
}
