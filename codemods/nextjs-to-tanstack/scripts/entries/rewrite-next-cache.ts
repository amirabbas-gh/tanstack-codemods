/**
 * Migrates `next/cache` usages toward TanStack Query patterns:
 * - `revalidateTag(expr)` → `queryClient.invalidateQueries({ queryKey: [expr] })`
 * - `revalidatePath(pathExpr)` → same shape (paths as query roots; align keys to your app)
 * - `unstable_cache(fn, …)` → unwrap to `fn` (migrate TTL/`tags` via `useQuery` + `staleTime` manually)
 * - `unstable_noStore()` → removed (`staleTime: 0` per-query replaces it)
 *
 * Replaces `next/cache` import lines: adds `queryClient` from a relative path to the shared
 * singleton written by `scaffold-tanstack-files` (`src/query-client.ts` or `query-client.ts`).
 * Inserts one \`// TODO:\` banner per file (unless \`next/cache migration (R4e)\` is already present); see R4e in \`TANSTACK_MIGRATION_NEXT_STEPS.md\`.
 */

import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { dirname, join, relative } from "path";
import { inferCodemodTargetDir, normalizePath } from "../utils/paths.ts";
import { hasSrcAppOrPages } from "../utils/has-src-app-or-pages.ts";
import { TODO_PREFIX } from "../utils/sentinels.ts";

const NEXT_CACHE = "next/cache";

const R4E_TODO_SENTINEL = "next/cache migration (R4e)";
const R4E_TODO_DOC = "https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation";

type Builtin = "revalidateTag" | "revalidatePath" | "unstable_cache" | "unstable_noStore";

type ImportSpecPiece = {
  exported: string;
  local: string;
  raw: string;
};

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();
  const edits: Edit[] = [];

  const fileAbs = normalizePath(root.filename());
  const pkgRoot = inferCodemodTargetDir(fileAbs);
  const qcSpecifier = queryClientSpecifierForFile(pkgRoot, fileAbs);

  const nextCacheImports = rootNode.findAll({ rule: { kind: "import_statement" } }).filter((s) => {
    const m = s.text().match(/from\s*["']([^"']+)["']/);
    return m?.[1] === NEXT_CACHE;
  });

  const builtinLocals = extractBuiltinBindings(nextCacheImports);
  if (builtinLocals.size === 0) {
    return null;
  }

  /** Count invalidation calls before we rewrite imports that depend on invalidateCount */
  let invalidateCount = 0;
  const preScanCalls = rootNode.findAll({
    rule: {
      kind: "call_expression",
      has: { field: "function", kind: "identifier" },
    },
  });
  for (const call of preScanCalls) {
    const fnId = immediateCallIdentifier(call);
    const builtin = fnId ? builtinLocals.get(fnId) : undefined;
    if (builtin !== "revalidateTag" && builtin !== "revalidatePath") continue;
    if (firstArgumentListExpr(call)) invalidateCount++;
  }

  const nextTodoLead = todoLeadAppender(source);

  for (const stmt of nextCacheImports) {
    const plan = planNextCacheImportRewrite(
      stmt,
      invalidateCount > 0 && qcSpecifier != null,
      qcSpecifier,
    );
    if (plan.kind === "noop") continue;

    const nl = /\r?\n$/.exec(stmt.text())?.[0] ?? "\n";

    if (plan.kind === "delete")
      edits.push(removeStatementSpan(source, stmt, nextTodoLead()));
    else if (plan.body + nl !== stmt.text()) {
      edits.push(stmt.replace(`${nextTodoLead()}${plan.body}${nl}`));
    }
  }

  const callSites = rootNode.findAll({
    rule: {
      kind: "call_expression",
      has: { field: "function", kind: "identifier" },
    },
  });

  for (const call of callSites) {
    const fnId = immediateCallIdentifier(call);
    if (!fnId) continue;
    const builtin = builtinLocals.get(fnId);
    if (!builtin) continue;

    if (builtin === "unstable_noStore") {
      const estmt = ascendToExpressionStatement(call);
      if (estmt) edits.push(removeStatementSpan(source, estmt, nextTodoLead()));
      else edits.push(call.replace("undefined"));
      continue;
    }

    if (builtin === "unstable_cache") {
      const fst = firstArgumentListExpr(call);
      if (fst) {
        edits.push(call.replace(`${nextTodoLead()}${fst.text()}`));
      }
      continue;
    }

    const arg = firstArgumentListExpr(call);
    if (!arg) continue;

    edits.push(
      call.replace(`${nextTodoLead()}queryClient.invalidateQueries({ queryKey: [${arg.text()}] })`),
    );
  }

  if (edits.length === 0) return null;

  edits.sort((a, b) => b.startPos - a.startPos);
  return rootNode.commitEdits(edits);
};

export default codemod;

/** One migration banner appended to the first structural edit (imports or call replace). */
function todoLeadAppender(source: string): () => string {
  if (source.includes(R4E_TODO_SENTINEL)) {
    return (): string => "";
  }
  let used = false;
  const banner = `\n${TODO_PREFIX}${R4E_TODO_SENTINEL}: wire \`queryClient\` through QueryClientProvider or your app root; every \`invalidateQueries({ queryKey })\` must match a real \`useQuery\` key; former \`unstable_cache\` TTL/tags → \`staleTime\` / gcTime / loaders; if you relied on \`unstable_noStore\`, use \`staleTime: 0\` (or refetch) for that data — ${R4E_TODO_DOC}\n`;
  return (): string => {
    if (used) return "";
    used = true;
    return banner;
  };
}

function queryClientSpecifierForFile(pkgRoot: string, fileAbs: string): string | null {
  const useSrc = hasSrcAppOrPages(pkgRoot);
  const qcAbsTs = join(pkgRoot, useSrc ? join("src", "query-client.ts") : "query-client.ts");
  const base = qcAbsTs.replace(/\\/g, "/").replace(/\.ts$/, "");
  let rel = relative(dirname(fileAbs), base).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return normalizePath(rel);
}

function immediateCallIdentifier(call: SgNode<TSX>): string | null {
  const fn = call.field("function");
  if (!fn || fn.kind() !== "identifier") return null;
  return fn.text();
}

function extractCallArgs(call: SgNode<TSX>): SgNode<TSX>[] {
  const list = call.field("arguments");
  if (!list) return [];
  const out: SgNode<TSX>[] = [];
  for (const ch of list.children()) {
    const k = ch.kind();
    if (k === "(" || k === ")" || k === ",") continue;
    out.push(ch as SgNode<TSX>);
  }
  return out;
}

function firstArgumentListExpr(call: SgNode<TSX>): SgNode<TSX> | null {
  const args = extractCallArgs(call);
  return args[0] ?? null;
}

function ascendToExpressionStatement(node: SgNode<TSX>): SgNode<TSX> | null {
  let cur: SgNode<TSX> | null = node.parent();
  while (cur && cur.kind() !== "expression_statement") {
    cur = cur.parent();
  }
  return cur;
}

function removeStatementSpan(source: string, stmt: SgNode<TSX>, insertedText = ""): Edit {
  const start = stmt.range().start.index;
  let end = stmt.range().end.index;
  while (end < source.length && (source[end] === " " || source[end] === "\t")) end++;
  if (source[end] === "\r") end++;
  if (source[end] === "\n") end++;
  return { startPos: start, endPos: end, insertedText };
}

function extractBuiltinBindings(importStmts: SgNode<TSX>[]): Map<string, Builtin> {
  const out = new Map<string, Builtin>();
  for (const stmt of importStmts) {
    const brace = extractNamedBrace(stmt.text());
    if (brace === null) continue;
    for (const raw of splitImportSpecifiers(brace)) {
      const p = parseImportPiece(raw);
      if (!p) continue;
      const b = builtinForExported(p.exported);
      if (b) out.set(p.local, b);
    }
  }
  return out;
}

function builtinForExported(name: string): Builtin | null {
  if (
    name === "revalidateTag" ||
    name === "revalidatePath" ||
    name === "unstable_cache" ||
    name === "unstable_noStore"
  ) {
    return name;
  }
  return null;
}

function parseImportPiece(raw: string): ImportSpecPiece | null {
  const t = raw.trim();
  const asMatch = /^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/.exec(t);
  if (asMatch) return { exported: asMatch[1]!, local: asMatch[2]!, raw: t };
  const id = /^([A-Za-z0-9_]+)$/.exec(t);
  if (!id) return null;
  return { exported: id[1]!, local: id[1]!, raw: t };
}

type ImportRewritePlan =
  | { kind: "noop" }
  | { kind: "delete" }
  | { kind: "replace"; body: string };

function planNextCacheImportRewrite(
  stmt: SgNode<TSX>,
  needsQc: boolean,
  qcSpecifier: string | null,
): ImportRewritePlan {
  const src = stmt.text();
  const brace = extractNamedBrace(src);
  if (brace === null) return { kind: "noop" };

  const kept: string[] = [];
  for (const raw of splitImportSpecifiers(brace)) {
    const p = parseImportPiece(raw);
    if (!p) {
      kept.push(raw.trim());
      continue;
    }
    if (builtinForExported(p.exported)) continue;
    kept.push(p.raw);
  }

  const lines: string[] = [];
  if (needsQc && qcSpecifier && !sourceStmtHasQueryImport(src, qcSpecifier))
    lines.push(`import { queryClient } from "${qcSpecifier}";`);
  if (kept.length > 0) lines.push(`import { ${kept.join(", ")} } from "${NEXT_CACHE}";`);

  if (lines.length === 0) return { kind: "delete" };
  return { kind: "replace", body: lines.join("\n") };
}

function sourceStmtHasQueryImport(stmtText: string, qcSpecifier: string): boolean {
  const q = escapeReg(qcSpecifier);
  return new RegExp(`import\\s+\\{[^}]*\\bqueryClient\\b[^}]*}\\s*from\\s*["']${q}["']`).test(stmtText);
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNamedBrace(text: string): string | null {
  const m = text.match(/\{\s*([^}]*)\s*\}\s*from/);
  return m?.[1] ?? null;
}

function splitImportSpecifiers(inner: string): string[] {
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
