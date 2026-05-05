/**
 * R10 — Flag async route components that still perform data fetching at render
 * time. Fully automated loader extraction stays unsafe across arbitrary
 * control-flow; instead we insert a searchable TODO so humans port data reads
 * into `Route.loader` / server-function patterns from the TanStack docs.
 */

import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";
import { bumpR10, relPathUnderPkg } from "../utils/migration-run-report.ts";
import { getFilename } from "../utils/paths.ts";
import { hasTodoSentinel, insertTodoBefore } from "../utils/sentinels.ts";

const LOADER_DOC =
  "https://tanstack.com/router/latest/docs/framework/react/guide/data-loading";

const TODO_NEEDLE = "Route.loader";

const r10Metric = useMetricAtom("nextjs-to-tanstack-r10-async-await");

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();

  if (!/\bcreateFileRoute\b/.test(source)) {
    return null;
  }

  const file = getFilename(root);
  if (/\/middleware\.tsx?$/i.test(file)) {
    return null;
  }

  const candidates = collectAsyncRouteComponents(rootNode);
  if (candidates.length === 0) return null;

  const edits: Edit[] = [];
  for (const node of candidates) {
    if (hasTodoSentinel(source, node, TODO_NEEDLE)) continue;
    if (!functionBodyUsesTopLevelAwait(node)) continue;
    edits.push(
      insertTodoBefore(
        node,
        `move async data fetching into ${TODO_NEEDLE} (or a server function); avoid heavy awaits in route components`,
        LOADER_DOC,
      ),
    );
  }

  if (edits.length === 0) return null;

  const absFile = getFilename(root);
  bumpR10(absFile, edits.length);
  r10Metric.increment({ file: relPathUnderPkg(absFile) }, edits.length);

  return rootNode.commitEdits(edits);
};

export default codemod;

function collectAsyncRouteComponents(rootNode: SgNode<TSX>): SgNode<TSX>[] {
  const seen = new Set<number>();
  const out: SgNode<TSX>[] = [];

  const innerCalls = rootNode.findAll({
    rule: {
      kind: "call_expression",
      has: {
        field: "function",
        kind: "identifier",
        regex: "^createFileRoute$",
      },
    },
  });

  for (const inner of innerCalls) {
    const parent = inner.parent();
    if (!parent || parent.kind() !== "call_expression") continue;
    const configObj = getSingleObjectArg(parent);
    if (!configObj) continue;
    const comp = getObjectPairValue(configObj, "component");
    if (!comp) continue;
    const fn = resolveAsyncComponentFunction(rootNode, comp);
    if (!fn) continue;
    const id = fn.id();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(fn);
  }

  return out;
}

function resolveAsyncComponentFunction(
  rootNode: SgNode<TSX>,
  value: SgNode<TSX>,
): SgNode<TSX> | null {
  if (value.kind() === "identifier") {
    const fn = findFunctionDeclaration(rootNode, value.text());
    if (fn && isAsyncFunctionNode(fn)) return fn;
    return null;
  }
  if (value.kind() === "arrow_function" || value.kind() === "function_expression") {
    return isAsyncFunctionNode(value) ? value : null;
  }
  return null;
}

function findFunctionDeclaration(rootNode: SgNode<TSX>, name: string): SgNode<TSX> | null {
  for (const fn of rootNode.findAll({ rule: { kind: "function_declaration" } })) {
    const nameNode = fn.field("name");
    if (nameNode?.text() === name) return fn;
  }
  return null;
}

function isAsyncFunctionNode(n: SgNode<TSX>): boolean {
  return n.children().some((c) => c.kind() === "async");
}

function getSingleObjectArg(call: SgNode<TSX>): SgNode<TSX> | null {
  const args = extractCallArgs(call);
  if (args.length !== 1) return null;
  const a = args[0];
  return a?.kind() === "object" ? a : null;
}

function extractCallArgs(call: SgNode<TSX>): SgNode<TSX>[] {
  const list = call.field("arguments");
  if (!list) return [];
  const out: SgNode<TSX>[] = [];
  for (const ch of list.children()) {
    if (ch.kind() === "(" || ch.kind() === ")" || ch.kind() === ",") continue;
    out.push(ch as SgNode<TSX>);
  }
  return out;
}

function getObjectPairValue(obj: SgNode<TSX>, wantKey: string): SgNode<TSX> | null {
  for (const pair of obj.findAll({ rule: { kind: "pair" } })) {
    if (pair.parent()?.id() !== obj.id()) continue;
    const keyNode = pair.field("key");
    const keyText =
      keyNode?.kind() === "property_identifier"
        ? keyNode.text()
        : (keyNode?.text().replace(/['"]/g, "").trim() ?? "");
    if (keyText !== wantKey) continue;
    return pair.field("value") ?? null;
  }
  return null;
}

/**
 * Avoid noisy TODOs on async components that only await React.use() / tiny hooks.
 * We only flag bodies that contain a top-level `await` in the outer function.
 */
function functionBodyUsesTopLevelAwait(fn: SgNode<TSX>): boolean {
  const body = fn.field("body");
  if (!body) return false;

  const awaited = body.findAll({
    rule: {
      kind: "await_expression",
    },
  });

  for (const aw of awaited) {
    if (awaitDepthWithinAsyncBoundary(aw, fn) === 0) return true;
  }
  return false;
}

/**
 * Returns nesting depth of `node` inside nested `arrow_function` / `function_expression` / `function_declaration`
 * bodies that sit between `node` and `stopAncestor`. 0 means the await is directly in `stopAncestor`'s body.
 */
function awaitDepthWithinAsyncBoundary(
  node: SgNode<TSX>,
  stopAncestor: SgNode<TSX>,
): number {
  let depth = 0;
  let cur: SgNode<TSX> | null = node.parent();
  while (cur && cur.id() !== stopAncestor.id()) {
    const kind = cur.kind();
    if (
      kind === "arrow_function" ||
      kind === "function_expression" ||
      kind === "function_declaration"
    ) {
      depth++;
    }
    cur = cur.parent();
  }
  return depth;
}
