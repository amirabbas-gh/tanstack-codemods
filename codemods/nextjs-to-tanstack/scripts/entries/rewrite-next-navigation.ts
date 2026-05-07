/**
 * Rewrites `next/navigation` to `@tanstack/react-router` where safe:
 * - `usePathname` → `useLocation` + `usePathname()` → `useLocation().pathname`
 * - `useSearchParams` → `useSearch` + call sites → `useSearch()`
 * - `useParams` → TanStack `useParams` (same call sites; valid under `RouterProvider`
 *   like `useNavigate` / `useLocation`).
 * - `redirect` / `permanentRedirect` → `redirect` from TanStack; single-arg calls become
 *   `throw redirect({ to | href: … })` and permanent → `statusCode: 308` (external URLs
 *   use `href` when the literal looks like http(s)).
 * - `useRouter().push` / `.replace` and binding `const r = useRouter(); r.push` / `.replace`
 *   → `useNavigate()` / binding calls with `NavigateOptions`: when safe, splits URLs into
 *   `to` (with `$param` segments, no interpolated path params), `params`, `search`, and
 *   `hash` per TanStack navigation docs; otherwise falls back to `to: <original expr>`.
 *   Skipped when the same binding uses `.prefetch`, `.back`, `.refresh`, or `.forward`.
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
        tanstackFromStmt.push(s);
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
      edits.push(
        call.replace(
          buildImperativeNavigationCall("useNavigate()", arg, prop === "replace"),
        ),
      );
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
        edits.push(
          parent.replace(buildImperativeNavigationCall(name, arg, p === "replace")),
        );
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

/**
 * Imperative navigation target for migrated `router.push` / `router.replace`.
 * Uses structured `to` + `params` + `search` + `hash` when the URL can be split safely;
 * see https://tanstack.com/router/latest/docs/framework/react/guide/navigation
 */
function buildImperativeNavigationCall(
  callee: string,
  arg: SgNode<TSX>,
  replace: boolean,
): string {
  const body = tryStructuredNavigateArg(arg) ?? `to: ${arg.text()}`;
  const suffix = replace ? ", replace: true" : "";
  return `${callee}({ ${body}${suffix} })`;
}

function tryStructuredNavigateArg(arg: SgNode<TSX>): string | null {
  const k = arg.kind();
  if (k === "string_literal" || k === "string") {
    const inner = stringLiteralInner(arg.text());
    if (/^https?:\/\//i.test(inner)) return null;
    return tryStructuredStaticPathQueryHash(inner);
  }
  if (k === "template_string") {
    return tryStructuredTemplateUrl(arg);
  }
  return null;
}

function stringLiteralInner(raw: string): string {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

function tryStructuredStaticPathQueryHash(inner: string): string | null {
  const hashIdx = inner.indexOf("#");
  let pathQuery = inner;
  let hash: string | null = null;
  if (hashIdx >= 0) {
    pathQuery = inner.slice(0, hashIdx);
    hash = inner.slice(hashIdx + 1);
  }
  const qIdx = pathQuery.indexOf("?");
  const path = qIdx >= 0 ? pathQuery.slice(0, qIdx) : pathQuery;
  const query = qIdx >= 0 ? pathQuery.slice(qIdx + 1) : "";
  if (!path.startsWith("/")) return null;
  const parts: string[] = [`to: ${JSON.stringify(path)}`];
  if (query.length > 0) {
    const s = parseQueryToSearchObjectLiteral(query);
    if (!s) return null;
    parts.push(`search: ${s}`);
  }
  if (hash !== null && hash.length > 0) {
    parts.push(`hash: ${JSON.stringify(hash)}`);
  }
  return parts.join(", ");
}

type TemplatePiece =
  | { kind: "str"; text: string }
  | { kind: "sub"; expr: SgNode<TSX> };

function collectTemplatePieces(node: SgNode<TSX>): TemplatePiece[] | null {
  if (node.kind() !== "template_string") return null;
  const out: TemplatePiece[] = [];
  let buf = "";
  for (const c of node.children()) {
    const k = c.kind();
    if (k === "`") continue;
    if (k === "string_fragment") {
      buf += c.text();
    } else if (k === "escape_sequence") {
      buf += c.text();
    } else if (k === "template_substitution") {
      if (buf.length) {
        out.push({ kind: "str", text: buf });
        buf = "";
      }
      const expr = templateSubstitutionExpr(c);
      if (!expr) return null;
      out.push({ kind: "sub", expr });
    }
  }
  if (buf.length) out.push({ kind: "str", text: buf });
  return out;
}

function templateSubstitutionExpr(sub: SgNode<TSX>): SgNode<TSX> | null {
  for (const c of sub.children()) {
    const k = c.kind();
    if (k === "${" || k === "}" || k === "$") continue;
    return c as SgNode<TSX>;
  }
  return null;
}

function simpleSubstitutionBinding(expr: SgNode<TSX>): { param: string; exprText: string } | null {
  if (expr.kind() !== "identifier") return null;
  const t = expr.text();
  return { param: t, exprText: t };
}

function tryStructuredTemplateUrl(node: SgNode<TSX>): string | null {
  const pieces = collectTemplatePieces(node);
  if (pieces === null) return null;

  type PathTok =
    | { t: "s"; v: string }
    | { t: "p"; param: string; exprText: string };

  const pathToks: PathTok[] = [];
  let queryBuf = "";
  let hashBuf = "";
  let phase: "path" | "query" | "hash" = "path";

  for (const p of pieces) {
    if (p.kind === "sub") {
      if (phase !== "path") return null;
      const b = simpleSubstitutionBinding(p.expr);
      if (!b) return null;
      pathToks.push({ t: "p", param: b.param, exprText: b.exprText });
    } else {
      const text = p.text;
      if (phase === "path") {
        const qAt = text.indexOf("?");
        const hAt = text.indexOf("#");
        if (hAt >= 0 && (qAt < 0 || hAt < qAt)) {
          if (hAt > 0) pathToks.push({ t: "s", v: text.slice(0, hAt) });
          phase = "hash";
          hashBuf += text.slice(hAt + 1);
          continue;
        }
        if (qAt >= 0) {
          if (qAt > 0) pathToks.push({ t: "s", v: text.slice(0, qAt) });
          phase = "query";
          queryBuf += text.slice(qAt + 1);
          continue;
        }
        pathToks.push({ t: "s", v: text });
      } else if (phase === "query") {
        if (/[?#]/.test(text)) return null;
        queryBuf += text;
      } else {
        hashBuf += text;
      }
    }
  }

  let toPat = "";
  const paramsOrder: string[] = [];
  const paramToExpr = new Map<string, string>();
  for (const t of pathToks) {
    if (t.t === "s") {
      toPat += t.v;
    } else {
      toPat += `$${t.param}`;
      if (!paramToExpr.has(t.param)) {
        paramsOrder.push(t.param);
        paramToExpr.set(t.param, t.exprText);
      }
    }
  }

  if (!toPat.startsWith("/")) return null;

  const out: string[] = [`to: ${JSON.stringify(toPat)}`];
  if (paramsOrder.length > 0) {
    const entries = paramsOrder.map((k) => {
      const ex = paramToExpr.get(k)!;
      return k === ex ? k : `${k}: ${ex}`;
    });
    out.push(`params: { ${entries.join(", ")} }`);
  }
  if (queryBuf.length > 0) {
    const s = parseQueryToSearchObjectLiteral(queryBuf);
    if (!s) return null;
    out.push(`search: ${s}`);
  }
  if (hashBuf.length > 0) {
    out.push(`hash: ${JSON.stringify(hashBuf)}`);
  }
  return out.join(", ");
}

function searchKeyFragment(key: string): string | null {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return key;
  try {
    return JSON.stringify(key);
  } catch {
    return null;
  }
}

function parseQueryToSearchObjectLiteral(query: string): string | null {
  const parts = query.split("&").filter((p) => p.length > 0);
  const props: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) {
      const kf = searchKeyFragment(part);
      if (!kf) return null;
      props.push(`${kf}: true`);
    } else {
      const key = part.slice(0, eq);
      const val = part.slice(eq + 1);
      const kf = searchKeyFragment(key);
      if (!kf) return null;
      props.push(`${kf}: ${JSON.stringify(val)}`);
    }
  }
  return `{ ${props.join(", ")} }`;
}

/** `useRouter` call is not the `foo` part of `foo.push` / `foo.replace`. */
function shouldReplaceBareUseRouterCall(call: SgNode<TSX>): boolean {
  const p = call.parent();
  if (p?.kind() !== "member_expression") return true;
  if (p.field("object")?.id() !== call.id()) return true;
  const prop = p.field("property")?.text();
  return prop !== "push" && prop !== "replace";
}
