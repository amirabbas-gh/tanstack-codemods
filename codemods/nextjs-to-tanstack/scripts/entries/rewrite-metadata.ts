/**
 * R7 — Convert Next.js `export const metadata` and `export const viewport`
 * objects into TanStack route `head()` config.
 *
 * Runs on `__root.tsx` and every renamed page file after R1/R2. Maps metadata
 * through `utils/metadata.ts`, viewport through `utils/viewport-meta.ts`, and
 * folds the result into the route config:
 *
 *   export const Route = createRootRoute({ component: X })
 * becomes:
 *   export const Route = createRootRoute({ head: () => ({...}), component: X })
 *
 * The original exports are removed, as are `Metadata` / `Viewport` type imports
 * from `"next"` when present.
 *
 * Dynamic / async `generateMetadata` / `generateViewport` exports are skipped
 * until a human wires them through `Route` loaders + `head()`.
 */

import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { removeImport } from "../utils/imports.ts";
import {
  composeHeadOption,
  metadataObjectToHeadParts,
} from "../utils/metadata.ts";
import { viewportObjectToMetaParts } from "../utils/viewport-meta.ts";
import { getAppRelativePath } from "../utils/paths.ts";
import { insertReviewBefore } from "../utils/sentinels.ts";

const codemod: Codemod<TSX> = async (root) => {
  const relative = getAppRelativePath(root);
  // Don't touch non-route files (anything outside src/app/).
  if (!relative.includes("/app/") && !relative.startsWith("app/")) {
    return null;
  }

  const rootNode = root.root();

  if (findNamedFunctionExport(rootNode, "generateMetadata")) return null;
  if (findNamedFunctionExport(rootNode, "generateViewport")) return null;

  const metadataExport = findExportedConstObject(rootNode, "metadata");
  const viewportExport = findExportedConstObject(rootNode, "viewport");

  if (!metadataExport && !viewportExport) return null;

  const routeCall = findRouteCallExpression(rootNode);
  if (!routeCall) return null;

  const configObj = findRouteConfigObject(routeCall);
  if (!configObj) return null;

  const metaItems: string[] = [];
  const linkItems: string[] = [];
  const reviewMessages: string[] = [];

  if (viewportExport) {
    const vp = viewportObjectToMetaParts(viewportExport.objNode);
    metaItems.push(...vp.metaItems);
    for (const w of vp.unmapped) {
      reviewMessages.push(`viewport.${w} could not be mapped automatically`);
    }
  }

  if (metadataExport) {
    const md = metadataObjectToHeadParts(metadataExport.objNode);
    metaItems.push(...md.metaItems);
    linkItems.push(...md.linkItems);
    for (const w of md.unmapped) {
      reviewMessages.push(`metadata.${w} could not be mapped automatically`);
    }
  }

  const headOption = composeHeadOption(metaItems, linkItems);

  const edits: Edit[] = [];
  const source = rootNode.text();

  // Inject `head: () => (...)` as the first property in the route config
  // object. We splice right after the opening `{`.
  const firstBrace = source.indexOf("{", configObj.range().start.index);
  if (firstBrace < 0) return null;

  const headLines = headOption.replace(/\n/g, "\n    ");
  const indented = `\n    ${headLines},`;

  edits.push({
    startPos: firstBrace + 1,
    endPos: firstBrace + 1,
    insertedText: indented,
  });

  const removals: Edit[] = [];
  if (viewportExport) {
    removals.push({
      startPos: viewportExport.lex.range().start.index,
      endPos: extendToTrailingNewline(
        source,
        viewportExport.lex.range().end.index,
      ),
      insertedText: "",
    });
  }
  if (metadataExport) {
    removals.push({
      startPos: metadataExport.lex.range().start.index,
      endPos: extendToTrailingNewline(
        source,
        metadataExport.lex.range().end.index,
      ),
      insertedText: "",
    });
  }
  removals.sort((a, b) => b.startPos - a.startPos);
  edits.push(...removals);

  const nextTypeSpecs: string[] = [];
  if (metadataExport) nextTypeSpecs.push("Metadata");
  if (viewportExport) nextTypeSpecs.push("Viewport");
  if (nextTypeSpecs.length > 0) {
    const nextTypesEdit = removeImport(rootNode, {
      type: "named",
      specifiers: nextTypeSpecs,
      from: "next",
    });
    if (nextTypesEdit) edits.push(nextTypesEdit);
  }

  for (const message of reviewMessages) {
    edits.push(insertReviewBefore(routeCall, message));
  }

  return rootNode.commitEdits(edits);
};

export default codemod;

interface ExportedConstObject {
  /** The enclosing `export_statement` (for full-line removal). */
  lex: SgNode<TSX>;
  /** The object literal. */
  objNode: SgNode<TSX>;
}

function findExportedConstObject(
  rootNode: SgNode<TSX>,
  exportName: string,
): ExportedConstObject | null {
  for (const child of rootNode.children()) {
    if (child.kind() !== "export_statement") continue;
    const decl = firstChildOfKind(child, "lexical_declaration")
      ?? firstChildOfKind(child, "variable_declaration");
    if (!decl) continue;
    const declarator = firstChildOfKind(decl, "variable_declarator");
    if (!declarator) continue;
    const nameNode = declarator.field("name");
    if (nameNode?.text() !== exportName) continue;
    const value = declarator.field("value");
    if (!value || !value.is("object")) continue;
    return { lex: child, objNode: value };
  }
  return null;
}

function findNamedFunctionExport(
  rootNode: SgNode<TSX>,
  name: string,
): SgNode<TSX> | null {
  return rootNode.find({
    rule: {
      kind: "function_declaration",
      has: {
        field: "name",
        regex: `^${name}$`,
      },
    },
  });
}

function findRouteCallExpression(rootNode: SgNode<TSX>): SgNode<TSX> | null {
  return rootNode.find({
    rule: {
      kind: "call_expression",
      has: {
        field: "function",
        kind: "identifier",
        regex: "^createFileRoute$|^createRootRoute$",
      },
    },
  });
}

function findRouteConfigObject(routeCall: SgNode<TSX>): SgNode<TSX> | null {
  // createFileRoute('path')(config) — the config is inside the second call.
  // createRootRoute(config) — the config is the first argument.
  // Walk upward from routeCall to find the containing call_expression that
  // has a parenthesised object argument.
  let cursor: SgNode<TSX> = routeCall;
  // Ascend through any chained `createFileRoute(...)` pattern.
  while (true) {
    const parent: SgNode<TSX> | null = cursor.parent();
    if (!parent) break;
    if (parent.kind() === "call_expression") {
      cursor = parent;
      continue;
    }
    break;
  }
  const args = cursor.field("arguments");
  if (!args) return null;
  for (const child of args.children()) {
    if (child.kind() === "object") return child;
  }
  return null;
}

function firstChildOfKind(parent: SgNode<TSX>, kind: string): SgNode<TSX> | null {
  for (const child of parent.children()) {
    if (child.kind() === kind) return child;
  }
  return null;
}

function extendToTrailingNewline(source: string, end: number): number {
  let i = end;
  while (i < source.length) {
    const ch = source[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === "\n") {
      i++;
      break;
    }
    if (ch === "\r") {
      i++;
      if (source[i] === "\n") i++;
      break;
    }
    break;
  }
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\n" || ch === "\r" || ch === " " || ch === "\t") {
      i++;
      continue;
    }
    break;
  }
  return i;
}
