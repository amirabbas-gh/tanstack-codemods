/**
 * Best-effort migration of `next/headers` named exports `cookies` and `headers`:
 * - `cookies().get(name)` / `(await cookies()).get(name)` → `getCookieFromRequest(undefined, name)`
 * - optional `.value` on the cookie object → `…?.value`
 * - `headers().get(name)` / `(await headers()).get(name)` → `readRequestHeader(undefined, name)`
 *
 * A leading `// TODO: … (R4f)` banner is inserted once (unless already present). Pass a real
 * `Request` from TanStack Router / Start instead of `undefined`.
 *
 * `draftMode` and other exports stay on a reduced `next/headers` import. Files with naked
 * `cookies()` / `headers()` (not chained to `.get`) are skipped.
 */

import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { dirname, join, relative } from "path";
import { inferCodemodTargetDir, normalizePath } from "../utils/paths.ts";
import { hasSrcAppOrPages } from "../utils/has-src-app-or-pages.ts";
import { TODO_PREFIX } from "../utils/sentinels.ts";

const NEXT_HEADERS = "next/headers";

const R4F_SENTINEL = "next/headers migration (R4f)";

type Builtin = "cookies" | "headers" | "draftMode";

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();

  const fileAbs = normalizePath(root.filename());
  const pkgRoot = inferCodemodTargetDir(fileAbs);
  const bridgeSpec = bridgeSpecifierForFile(pkgRoot, fileAbs);

  const hdrImports = rootNode
    .findAll({ rule: { kind: "import_statement" } })
    .filter((s) => parseImportSource(s.text()) === NEXT_HEADERS);

  const locals = extractBindings(hdrImports);
  if (locals.size === 0) return null;

  const cookiesNm = [...locals.entries()].find(([, b]) => b === "cookies")?.[0];
  const headersNm = [...locals.entries()].find(([, b]) => b === "headers")?.[0];

  if (!cookiesNm && !headersNm) return null;

  if (cookiesNm && nakedFactoryCalls(rootNode, cookiesNm)) return null;
  if (headersNm && nakedFactoryCalls(rootNode, headersNm)) return null;

  let needCookie = false;
  let needHeader = false;
  for (const outer of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const fn = outer.field("function");
    if (!fn || fn.kind() !== "member_expression") continue;
    if (fn.field("property")?.text() !== "get") continue;
    const obj = fn.field("object");
    if (!obj) continue;
    const factoryBase = unwrapAwaitParens(obj);
    if (!factoryBase || factoryBase.kind() !== "call_expression") continue;
    const callee = factoryBase.field("function");
    if (!callee || callee.kind() !== "identifier") continue;
    const fac = callee.text();
    if ((fac !== cookiesNm && fac !== headersNm) || !firstArg(outer.field("arguments"))) continue;
    if (fac === cookiesNm) needCookie = true;
    if (fac === headersNm) needHeader = true;
  }

  if (!needCookie && !needHeader) return null;

  const take = todoBannerTake(source);
  const edits: Edit[] = [];

  for (const stmt of hdrImports) {
    const plan = buildImportRewrite(stmt.text(), locals, needCookie, needHeader, bridgeSpec);
    if (plan === null) continue;
    const nl = /\r?\n$/.exec(stmt.text())?.[0] ?? "\n";

    if (plan.kind === "delete") edits.push(blankStmt(source, stmt));
    else if (plan.text + nl !== stmt.text()) edits.push(stmt.replace(`${take()}${plan.text}${nl}`));
  }

  for (const outer of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const fn = outer.field("function");
    if (!fn || fn.kind() !== "member_expression") continue;
    if (fn.field("property")?.text() !== "get") continue;

    const obj = fn.field("object");
    if (!obj) continue;
    const factoryBase = unwrapAwaitParens(obj);
    if (!factoryBase || factoryBase.kind() !== "call_expression") continue;

    const callee = factoryBase.field("function");
    if (!callee || callee.kind() !== "identifier") continue;
    const fac = callee.text();

    const a0 = firstArg(outer.field("arguments"));
    if (!a0) continue;
    const a0t = a0.text();

    if (fac === cookiesNm) {
      let target: SgNode<TSX> = outer;
      let withValue = false;
      const up = outer.parent();
      if (
        up?.kind() === "member_expression" &&
        up.field("property")?.text() === "value" &&
        up.field("object")?.id() === outer.id()
      ) {
        target = up;
        withValue = true;
      }

      const mid = `getCookieFromRequest(undefined, ${a0t})`;
      const repl = withValue ? `${mid}?.value` : mid;
      edits.push(target.replace(`${take()}${repl}`));
      continue;
    }

    if (fac === headersNm) {
      edits.push(outer.replace(`${take()}readRequestHeader(undefined, ${a0t})`));
    }
  }

  if (edits.length === 0) return null;

  edits.sort((a, b) => b.startPos - a.startPos);
  return rootNode.commitEdits(edits);
};

export default codemod;

function todoBannerTake(source: string): () => string {
  if (source.includes(R4F_SENTINEL)) {
    return (): string => "";
  }
  let used = false;
  const line = `${TODO_PREFIX}${R4F_SENTINEL}: pass a real Web \`Request\` from TanStack Router / Start (\`createRouter\` context, server route, Nitro) — HTTP-only cookies stay server-side — https://tanstack.com/router/latest/docs/framework/react/guide/router-context\n`;
  return (): string => {
    if (used) return "";
    used = true;
    return `\n${line}`;
  };
}

function nakedFactoryCalls(root: SgNode<TSX>, factoryName: string): boolean {
  const calls = root.findAll({
    rule: {
      kind: "call_expression",
      has: {
        field: "function",
        kind: "identifier",
        regex: `^${escapeRx(factoryName)}$`,
      },
    },
  });

  for (const c of calls) {
    const p0 = c.parent();
    if (p0?.kind() === "await_expression") {
      const p1 = p0.parent();
      if (
        p1?.kind() === "member_expression" &&
        p1.field("property")?.text() === "get" &&
        p1.field("object")?.id() === p0.id()
      )
        continue;
      return true;
    }
    if (
      p0?.kind() === "member_expression" &&
      p0.field("property")?.text() === "get" &&
      p0.field("object")?.id() === c.id()
    )
      continue;
    return true;
  }
  return false;
}

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ImportRewrite = { kind: "delete" } | { kind: "replace"; text: string };

function buildImportRewrite(
  stmtText: string,
  locals: Map<string, Builtin>,
  needCookie: boolean,
  needHeader: boolean,
  bridgeSpec: string | null,
): ImportRewrite | null {
  const brace = extractNamedBrace(stmtText);
  if (brace === null) return null;

  const kept: string[] = [];
  for (const raw of splitSpecs(brace)) {
    const p = parsePiece(raw);
    if (!p) {
      kept.push(raw.trim());
      continue;
    }
    const b = locals.get(p.local);
    if (b === "cookies" || b === "headers") continue;
    kept.push(p.raw);
  }

  const lines: string[] = [];
  if ((needCookie || needHeader) && bridgeSpec) {
    const names: string[] = [];
    if (needCookie) names.push("getCookieFromRequest");
    if (needHeader) names.push("readRequestHeader");
    lines.push(`import { ${names.join(", ")} } from "${bridgeSpec}";`);
  }
  if (kept.length) lines.push(`import { ${kept.join(", ")} } from "${NEXT_HEADERS}";`);

  if (lines.length === 0) return { kind: "delete" };
  return { kind: "replace", text: lines.join("\n") };
}

function bridgeSpecifierForFile(pkgRoot: string, fileAbs: string): string | null {
  const useSrc = hasSrcAppOrPages(pkgRoot);
  const b = join(pkgRoot, useSrc ? join("src", "next-headers-bridge.ts") : "next-headers-bridge.ts");
  const base = b.replace(/\\/g, "/").replace(/\.ts$/, "");
  let rel = relative(dirname(fileAbs), base).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return normalizePath(rel);
}

function parseImportSource(t: string): string | null {
  const m = t.match(/from\s*["']([^"']+)["']/);
  return m?.[1] ?? null;
}

function extractNamedBrace(text: string): string | null {
  const m = text.match(/\{\s*([^}]*)\s*\}\s*from/);
  return m?.[1] ?? null;
}

function splitSpecs(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "{" || ch === "(" || ch === "<") depth++;
    else if (ch === "}" || ch === ")" || ch === ">") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parsePiece(raw: string): { exported: string; local: string; raw: string } | null {
  const t = raw.trim();
  const am = /^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/.exec(t);
  if (am) return { exported: am[1]!, local: am[2]!, raw: t };
  const id = /^([A-Za-z0-9_]+)$/.exec(t);
  if (!id) return null;
  return { exported: id[1]!, local: id[1]!, raw: t };
}

function extractBindings(stmts: SgNode<TSX>[]): Map<string, Builtin> {
  const out = new Map<string, Builtin>();
  for (const stmt of stmts) {
    const brace = extractNamedBrace(stmt.text());
    if (!brace) continue;
    for (const r of splitSpecs(brace)) {
      const p = parsePiece(r);
      if (!p) continue;
      if (p.exported === "cookies") out.set(p.local, "cookies");
      else if (p.exported === "headers") out.set(p.local, "headers");
      else if (p.exported === "draftMode") out.set(p.local, "draftMode");
    }
  }
  return out;
}

function unwrapAwaitParens(n: SgNode<TSX>): SgNode<TSX> | null {
  let x: SgNode<TSX> | null = n;
  if (x.kind() === "parenthesized_expression") {
    x = singleNonPunctuationChild(x);
  }
  if (!x) return null;
  if (x.kind() === "await_expression") {
    x = singleNonPunctuationChild(x);
  }
  return x;
}

/** First AST child that is not parentheses or the `await` keyword token. */
function singleNonPunctuationChild(n: SgNode<TSX>): SgNode<TSX> | null {
  for (const c of n.children()) {
    const k = c.kind();
    if (k === "(" || k === ")" || k === "await") continue;
    return c as SgNode<TSX>;
  }
  return null;
}

function firstArg(args: SgNode<TSX> | null): SgNode<TSX> | null {
  if (!args) return null;
  for (const ch of args.children()) {
    const k = ch.kind();
    if (k === "(" || k === ")" || k === ",") continue;
    return ch as SgNode<TSX>;
  }
  return null;
}

function blankStmt(source: string, stmt: SgNode<TSX>): Edit {
  const start = stmt.range().start.index;
  let end = stmt.range().end.index;
  while (end < source.length && (source[end] === " " || source[end] === "\t")) end++;
  if (source[end] === "\r") end++;
  if (source[end] === "\n") end++;
  return { startPos: start, endPos: end, insertedText: "" };
}
