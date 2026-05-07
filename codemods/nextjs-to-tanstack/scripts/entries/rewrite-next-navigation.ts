/**
 * Rewrites `next/navigation` to `@tanstack/react-router` where safe:
 * - `usePathname` → `useLocation` + `usePathname()` → `useLocation().pathname`
 * - `useSearchParams` → `useSearch` + call sites → `useSearch()`
 * - `useParams` → TanStack `useParams` only when the file defines a file route
 *   (`createFileRoute` / `createLazyFileRoute`).
 * - `redirect` / `permanentRedirect` → `redirect` from TanStack; single-arg calls become
 *   `throw redirect({ to | href: … })` and permanent → `statusCode: 308` (external URLs
 *   use `href` when the literal looks like http(s)).
 * - `useRouter().push` / `.replace` and binding `const r = useRouter(); r.push` / `.replace`
 *   → `useNavigate()({ to: … })` (optional `replace: true`), skipped when the same binding
 *   uses `.prefetch`, `.back`, `.refresh`, or `.forward`.
 *
 * `// TODO (R4g)` once when `redirect`/router navigation call patterns are rewritten.
 * Other hook import moves (pathname/search only) do not add R4g.
 */

import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { TODO_PREFIX } from "../utils/sentinels.ts";

const NEXT_NAV = "next/navigation";
const TANSTACK = "@tanstack/react-router";

const R4G_SENTINEL = "next/navigation migration (R4g)";

const UNSUPPORTED_ROUTER_MEMBERS = new Set([
  "prefetch",
  "refresh",
  "back",
  "forward",
]);

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();

  const allowUseParamsFromTanStack =
    rootNode.find({
      rule: {
        kind: "call_expression",
        has: {
          field: "function",
          kind: "identifier",
          regex: "^(createFileRoute|createLazyFileRoute)$",
        },
      },
    }) !== null;

  const skipUseRouterCallMigrate = shouldSkipUseRouterMigration(rootNode);

  const redirectKinds = new Map<string, "plain" | "permanent">();
  let needsUseLocation = false;
  let needsUseSearch = false;

  const importStmts = rootNode.findAll({
    rule: {
      kind: "import_statement",
      regex: "next/navigation",
    },
  });

  const importPlan: {
    stmt: SgNode<TSX>;
    text: string;
  }[] = [];

  for (const stmt of importStmts) {
    const text = stmt.text();
    if (!/from\s*["']next\/navigation["']/.test(text)) continue;

    const specText = extractNamedSpecifiersBrace(text);
    if (specText === null) continue;

    const specs = splitImportSpecifiers(specText);
    if (specs.length === 0) continue;

    const keepNext: string[] = [];
    const tanstackFromStmt: string[] = [];

    for (const raw of specs) {
      const s = raw.trim();
      if (!s) continue;

      const rp = parseImportSpecifier(s);
      if (rp?.exported === "redirect") {
        redirectKinds.set(rp.local, "plain");
        tanstackFromStmt.push(rp.local === "redirect" ? "redirect" : `redirect as ${rp.local}`);
        continue;
      }
      if (rp?.exported === "permanentRedirect") {
        redirectKinds.set(rp.local, "permanent");
        tanstackFromStmt.push(`redirect as ${rp.local}`);
        continue;
      }

      if (/^useRouter\b/.test(s)) {
        if (skipUseRouterCallMigrate) {
          keepNext.push(s);
        } else {
          tanstackFromStmt.push(s.replace(/^useRouter\b/, "useNavigate"));
        }
        continue;
      }
      if (/^usePathname\b/.test(s)) {
        tanstackFromStmt.push(s.replace(/^usePathname\b/, "useLocation"));
        needsUseLocation = true;
        continue;
      }
      if (/^useSearchParams\b/.test(s)) {
        tanstackFromStmt.push(s.replace(/^useSearchParams\b/, "useSearch"));
        needsUseSearch = true;
        continue;
      }
      if (/^useParams\b/.test(s)) {
        if (allowUseParamsFromTanStack) {
          tanstackFromStmt.push(s);
          continue;
        }
        keepNext.push(s);
        continue;
      }

      keepNext.push(s);
    }

    const mergedTanstack = mergeTanstackImports(tanstackFromStmt);

    const replacementLines: string[] = [];
    if (keepNext.length > 0) {
      replacementLines.push(`import { ${keepNext.join(", ")} } from "${NEXT_NAV}";`);
    }
    if (mergedTanstack.length > 0) {
      replacementLines.push(`import { ${mergedTanstack.join(", ")} } from "${TANSTACK}";`);
    }

    const inserted =
      replacementLines.length > 0 ? `${replacementLines.join("\n")}\n` : "";
    if (inserted.replace(/\s+$/, "") === text.replace(/\s+$/, "")) continue;
    importPlan.push({ stmt, text: inserted });
  }

  const edits: Edit[] = [];

  let routerNavEdits = 0;
  if (!skipUseRouterCallMigrate) {
    for (const call of inlineUseRouterNavCalls(rootNode)) {
      const prop = navProp(call);
      if (!prop) continue;
      const inner = useRouterCalleeCall(call);
      if (!inner) continue;
      const arg = firstCallArg(call.field("arguments"));
      if (!arg) continue;
      const argText = arg.text();
      if (prop === "push") {
        edits.push(call.replace(`useNavigate()({ to: ${argText} })`));
      } else {
        edits.push(call.replace(`useNavigate()({ to: ${argText}, replace: true })`));
      }
      routerNavEdits++;
    }

    for (const name of collectUseRouterBindingNames(rootNode)) {
      for (const mem of rootNode.findAll({
        rule: {
          kind: "member_expression",
          has: {
            field: "object",
            kind: "identifier",
            regex: `^${escapeRx(name)}$`,
          },
        },
      })) {
        const p = mem.field("property")?.text();
        if (p !== "push" && p !== "replace") continue;
        const parent = mem.parent();
        if (!parent || parent.kind() !== "call_expression") continue;
        if (parent.field("function")?.id() !== mem.id()) continue;
        const arg = firstCallArg(parent.field("arguments"));
        if (!arg) continue;
        const argText = arg.text();
        const repl =
          p === "push"
            ? `${name}({ to: ${argText} })`
            : `${name}({ to: ${argText}, replace: true })`;
        edits.push(parent.replace(repl));
        routerNavEdits++;
      }
    }
  }

  let redirectEdits = 0;
  for (const [local, kind] of redirectKinds) {
    for (const call of rootNode.findAll({
      rule: {
        kind: "call_expression",
        has: {
          field: "function",
          kind: "identifier",
          regex: `^${escapeRx(local)}$`,
        },
      },
    })) {
      const args = call.field("arguments");
      const a0 = firstCallArg(args);
      if (!a0) continue;
      if (firstCallArgAfter(args, a0)) continue;

      const toOrHref = redirectToPayload(a0);
      if (!toOrHref) continue;

      const opts =
        kind === "permanent"
          ? `{ ${toOrHref.key}: ${toOrHref.expr}, statusCode: 308 }`
          : `{ ${toOrHref.key}: ${toOrHref.expr} }`;
      const newCall = `${local}(${opts})`;
      const e = buildRedirectThrowEdit(call, newCall, source);
      if (e) {
        edits.push(e);
        redirectEdits++;
      }
    }
  }

  if (!skipUseRouterCallMigrate) {
    for (const call of rootNode.findAll({
      rule: {
        kind: "call_expression",
        has: {
          field: "function",
          kind: "identifier",
          regex: "^useRouter$",
        },
      },
    })) {
      if (!shouldReplaceBareUseRouterCall(call)) continue;
      edits.push(call.replace("useNavigate()"));
    }
  }

  const needsR4gBanner = redirectEdits > 0 || routerNavEdits > 0;
  const takeBanner = needsR4gBanner ? todoBannerTake(source) : (): string => "";

  for (const { stmt, text } of importPlan) {
    edits.push({
      startPos: stmt.range().start.index,
      endPos: stmt.range().end.index,
      insertedText: `${takeBanner()}${text}`,
    });
  }

  if (needsUseLocation) {
    for (const call of rootNode.findAll({
      rule: {
        kind: "call_expression",
        has: {
          field: "function",
          kind: "identifier",
          regex: "^usePathname$",
        },
      },
    })) {
      edits.push(call.replace("useLocation().pathname"));
    }
  }

  if (needsUseSearch) {
    for (const call of rootNode.findAll({
      rule: {
        kind: "call_expression",
        has: {
          field: "function",
          kind: "identifier",
          regex: "^useSearchParams$",
        },
      },
    })) {
      edits.push(call.replace("useSearch()"));
    }
  }

  if (edits.length === 0) return null;
  edits.sort((a, b) => b.startPos - a.startPos);
  return rootNode.commitEdits(edits);
};

export default codemod;

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseImportSpecifier(
  raw: string,
): { exported: string; local: string } | null {
  const t = raw.trim();
  const am = /^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/.exec(t);
  if (am) return { exported: am[1]!, local: am[2]! };
  const id = /^([A-Za-z0-9_]+)$/.exec(t);
  if (!id) return null;
  return { exported: id[1]!, local: id[1]! };
}

function todoBannerTake(source: string): () => string {
  if (source.includes(R4G_SENTINEL)) {
    return (): string => "";
  }
  let used = false;
  const line = `${TODO_PREFIX}${R4G_SENTINEL}: use \`throw redirect()\` in loaders / beforeLoad — client nav: \`useNavigate()\` — https://tanstack.com/router/latest/docs/framework/react/guide/navigation\n`;
  return (): string => {
    if (used) return "";
    used = true;
    return `\n${line}`;
  };
}

function shouldSkipUseRouterMigration(root: SgNode<TSX>): boolean {
  for (const name of collectUseRouterBindingNames(root)) {
    if (bindingUsesUnsupportedRouterMember(root, name)) return true;
  }
  return false;
}

function collectUseRouterBindingNames(root: SgNode<TSX>): Set<string> {
  const out = new Set<string>();
  for (const decl of root.findAll({ rule: { kind: "variable_declarator" } })) {
    const id = decl.field("name");
    const init = decl.field("value");
    if (!init || init.kind() !== "call_expression") continue;
    const callee = init.field("function");
    if (callee?.kind() !== "identifier" || callee.text() !== "useRouter") continue;
    if (id?.kind() !== "identifier") continue;
    out.add(id.text());
  }
  return out;
}

function bindingUsesUnsupportedRouterMember(root: SgNode<TSX>, bindingName: string): boolean {
  for (const mem of root.findAll({
    rule: {
      kind: "member_expression",
      has: {
        field: "object",
        kind: "identifier",
        regex: `^${escapeRx(bindingName)}$`,
      },
    },
  })) {
    const p = mem.field("property")?.text();
    if (p && UNSUPPORTED_ROUTER_MEMBERS.has(p)) return true;
  }
  return false;
}

function inlineUseRouterNavCalls(root: SgNode<TSX>): SgNode<TSX>[] {
  const out: SgNode<TSX>[] = [];
  for (const call of root.findAll({ rule: { kind: "call_expression" } })) {
    const fn = call.field("function");
    if (!fn || fn.kind() !== "member_expression") continue;
    const prop = fn.field("property")?.text();
    if (prop !== "push" && prop !== "replace") continue;
    const obj = fn.field("object");
    if (!obj || obj.kind() !== "call_expression") continue;
    const c = obj.field("function");
    if (c?.kind() !== "identifier" || c.text() !== "useRouter") continue;
    out.push(call);
  }
  return out;
}

function useRouterCalleeCall(maybeMemberCall: SgNode<TSX>): SgNode<TSX> | null {
  const fn = maybeMemberCall.field("function");
  if (!fn || fn.kind() !== "member_expression") return null;
  const obj = fn.field("object");
  if (!obj || obj.kind() !== "call_expression") return null;
  return obj;
}

function navProp(maybeMemberCall: SgNode<TSX>): "push" | "replace" | null {
  const fn = maybeMemberCall.field("function");
  if (!fn || fn.kind() !== "member_expression") return null;
  const p = fn.field("property")?.text();
  return p === "push" || p === "replace" ? p : null;
}

function firstCallArg(args: SgNode<TSX> | null): SgNode<TSX> | null {
  if (!args) return null;
  for (const ch of args.children()) {
    const k = ch.kind();
    if (k === "(" || k === ")" || k === ",") continue;
    return ch as SgNode<TSX>;
  }
  return null;
}

function firstCallArgAfter(args: SgNode<TSX> | null, first: SgNode<TSX>): SgNode<TSX> | null {
  if (!args) return null;
  let seen = false;
  let next = false;
  for (const ch of args.children()) {
    const k = ch.kind();
    if (k === "(" || k === ")") continue;
    if (k === ",") {
      if (seen) next = true;
      continue;
    }
    if (next) return ch as SgNode<TSX>;
    if (ch.id() === first.id()) seen = true;
  }
  return null;
}

type ToOrHref = { key: "to" | "href"; expr: string };

function redirectToPayload(arg: SgNode<TSX>): ToOrHref | null {
  const k = arg.kind();
  if (k === "string_literal" || k === "string" || k === "template_string") {
    const t = arg.text();
    if (
      (t.startsWith('"') || t.startsWith("'")) &&
      /^["']https?:\/\//i.test(t)
    ) {
      return { key: "href", expr: arg.text() };
    }
    if (k === "template_string") {
      return { key: "to", expr: arg.text() };
    }
    const inner = t.slice(1, -1);
    if (/^https?:\/\//i.test(inner)) return { key: "href", expr: arg.text() };
    return { key: "to", expr: arg.text() };
  }
  if (k === "identifier") return { key: "to", expr: arg.text() };
  return null;
}

function buildRedirectThrowEdit(
  call: SgNode<TSX>,
  newRedirectCall: string,
  source: string,
): Edit | null {
  const p = call.parent();
  if (p?.kind() === "throw_statement") {
    return {
      startPos: call.range().start.index,
      endPos: call.range().end.index,
      insertedText: newRedirectCall,
    };
  }

  if (p?.kind() === "return_statement") {
    const r = p.range();
    const seg = source.slice(r.start.index, r.end.index).trimEnd();
    const semi = seg.endsWith(";") ? ";" : "";
    return {
      startPos: r.start.index,
      endPos: r.end.index,
      insertedText: `throw ${newRedirectCall}${semi}`,
    };
  }

  if (p?.kind() === "expression_statement") {
    const stmt = p.range();
    const semi = source.slice(stmt.start.index, stmt.end.index).trimEnd().endsWith(";")
      ? ";"
      : "";
    return {
      startPos: stmt.start.index,
      endPos: stmt.end.index,
      insertedText: `throw ${newRedirectCall}${semi}`,
    };
  }

  return {
    startPos: call.range().start.index,
    endPos: call.range().end.index,
    insertedText: `throw ${newRedirectCall}`,
  };
}

function extractNamedSpecifiersBrace(importText: string): string | null {
  const m = importText.match(/\{([^}]*)\}\s*from/);
  return m?.[1] ?? null;
}

function splitImportSpecifiers(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "{" || ch === "(" || ch === "<") depth++;
    if (ch === "}" || ch === ")" || ch === ">") depth = Math.max(0, depth - 1);

    if (ch === "," && depth === 0) {
      if (cur.trim().length) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim().length) out.push(cur.trim());
  return out;
}

function mergeTanstackImports(specs: string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const s of specs) {
    const key = s.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(key);
  }
  return list;
}

/** `useRouter` call is not the `foo` part of `foo.push` / `foo.replace`. */
function shouldReplaceBareUseRouterCall(call: SgNode<TSX>): boolean {
  const p = call.parent();
  if (p?.kind() !== "member_expression") return true;
  if (p.field("object")?.id() !== call.id()) return true;
  const prop = p.field("property")?.text();
  return prop !== "push" && prop !== "replace";
}
