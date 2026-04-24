/**
 * R4 + R5 — Swap `next/link` and `next/image` to their TanStack / Unpic
 * equivalents.
 *
 * R4 (`next/link` → `@tanstack/react-router` Link):
 *   - `import Link from "next/link"` → `import { Link } from "@tanstack/react-router"`.
 *   - Every `<Link href={...}>` using the imported alias → `<Link to={...}>`.
 *
 * R5 (`next/image` → `@unpic/react` Image):
 *   - `import Image from "next/image"` → `import { Image } from "@unpic/react"`.
 *   - Numeric-string `width` / `height` attributes are converted to numeric
 *     JSX expressions (`width="600"` → `width={600}`); non-numeric values
 *     stay as-is with a review sentinel.
 *
 * Both rules use `getImport` to locate the actual local alias, which means
 * aliased imports (`import MyLink from "next/link"`) are handled correctly
 * and a shadowing local `function Link()` is left alone.
 */

import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { addImport, getImport, removeImport } from "../utils/imports.ts";
import { insertReviewBefore } from "../utils/sentinels.ts";

const NEXT_LINK = "next/link";
const NEXT_IMAGE = "next/image";
const TANSTACK_ROUTER = "@tanstack/react-router";
const UNPIC = "@unpic/react";

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const edits: Edit[] = [];

  const linkImport = getImport(rootNode, { type: "default", from: NEXT_LINK });
  if (linkImport && !linkImport.isNamespace) {
    edits.push(...rewriteLink(rootNode, linkImport.alias));
  }

  const imageImport = getImport(rootNode, { type: "default", from: NEXT_IMAGE });
  if (imageImport && !imageImport.isNamespace) {
    edits.push(...rewriteImage(rootNode, imageImport.alias));
  }

  if (edits.length === 0) return null;
  return rootNode.commitEdits(edits);
};

export default codemod;

function rewriteLink(rootNode: SgNode<TSX>, alias: string): Edit[] {
  const edits: Edit[] = [];

  const removeEdit = removeImport(rootNode, { type: "default", from: NEXT_LINK });
  if (removeEdit) edits.push(removeEdit);

  const addEdit = addImport(rootNode, {
    type: "named",
    specifiers: [alias === "Link" ? { name: "Link" } : { name: "Link", alias }],
    from: TANSTACK_ROUTER,
  });
  if (addEdit) edits.push(addEdit);

  for (const opening of findJsxOpens(rootNode, alias)) {
    for (const attr of opening.findAll({ rule: { kind: "jsx_attribute" } })) {
      const name = firstChildOfKind(attr, "property_identifier");
      if (!name || name.text() !== "href") continue;
      edits.push(name.replace("to"));
    }
  }

  return edits;
}

function rewriteImage(rootNode: SgNode<TSX>, alias: string): Edit[] {
  const edits: Edit[] = [];

  const removeEdit = removeImport(rootNode, { type: "default", from: NEXT_IMAGE });
  if (removeEdit) edits.push(removeEdit);

  const addEdit = addImport(rootNode, {
    type: "named",
    specifiers: [alias === "Image" ? { name: "Image" } : { name: "Image", alias }],
    from: UNPIC,
  });
  if (addEdit) edits.push(addEdit);

  for (const opening of findJsxOpens(rootNode, alias)) {
    for (const attr of opening.findAll({ rule: { kind: "jsx_attribute" } })) {
      const nameNode = firstChildOfKind(attr, "property_identifier");
      if (!nameNode) continue;
      const attrName = nameNode.text();
      if (attrName !== "width" && attrName !== "height") continue;

      const valueNode = attrValueNode(attr);
      if (!valueNode) continue;
      if (!valueNode.is("string")) continue; // Already numeric / non-string value.

      const frag = valueNode.find({ rule: { kind: "string_fragment" } });
      if (!frag) continue;
      const literal = frag.text();
      if (/^\d+$/.test(literal)) {
        edits.push(valueNode.replace(`{${literal}}`));
      } else {
        edits.push(
          insertReviewBefore(
            opening,
            `next/image → unpic: ${attrName}="${literal}" is non-numeric; unpic expects number`,
          ),
        );
      }
    }
  }

  return edits;
}

function findJsxOpens(rootNode: SgNode<TSX>, alias: string): SgNode<TSX>[] {
  const rx = `^${escapeRegex(alias)}$`;
  return rootNode.findAll({
    rule: {
      any: [
        {
          kind: "jsx_opening_element",
          has: { field: "name", kind: "identifier", regex: rx },
        },
        {
          kind: "jsx_self_closing_element",
          has: { field: "name", kind: "identifier", regex: rx },
        },
      ],
    },
  });
}

function firstChildOfKind(parent: SgNode<TSX>, kind: string): SgNode<TSX> | null {
  for (const child of parent.children()) {
    if (child.kind() === kind) return child;
  }
  return null;
}

function attrValueNode(attr: SgNode<TSX>): SgNode<TSX> | null {
  // jsx_attribute children: property_identifier, "=", value.
  // The value can be a string, jsx_expression, or (rare) identifier.
  const children = attr.children();
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (!child) continue;
    const k = child.kind();
    if (k === "property_identifier" || k === "=") continue;
    return child;
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
