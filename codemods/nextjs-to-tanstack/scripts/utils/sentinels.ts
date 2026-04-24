/**
 * Two-tier safety markers:
 *
 *  - Tier 1 ("CODEMOD: review"): the codemod performed the edit; a reviewer
 *    should verify the field coverage / naming / etc.
 *  - Tier 2 ("TODO [CODEMOD]"): the codemod refused to perform the edit; the
 *    user must handle this change by hand.
 *
 * Every sentinel uses a stable prefix so `rg 'CODEMOD: review'` and
 * `rg 'TODO \[CODEMOD\]'` surface every follow-up in one place at the end
 * of the run.
 */

import type { Edit, SgNode, TypesMap } from "codemod:ast-grep";

const REVIEW_PREFIX = "// CODEMOD: review — ";
const TODO_PREFIX = "// TODO [CODEMOD]: ";

type AnyNode = SgNode<TypesMap>;

/**
 * Build a leading-line comment insertion at the start of the given node.
 * The comment inherits the node's column indentation so multi-line blocks
 * stay visually aligned.
 */
export function insertReviewBefore<T extends TypesMap>(
  node: SgNode<T>,
  message: string,
): Edit {
  return buildLeadingCommentEdit(node as unknown as AnyNode, `${REVIEW_PREFIX}${message}`);
}

export function insertTodoBefore<T extends TypesMap>(
  node: SgNode<T>,
  message: string,
  docUrl?: string,
): Edit {
  const body = docUrl ? `${message} — ${docUrl}` : message;
  return buildLeadingCommentEdit(node as unknown as AnyNode, `${TODO_PREFIX}${body}`);
}

function buildLeadingCommentEdit(node: AnyNode, commentLine: string): Edit {
  const range = node.range();
  const column = range.start.column;
  const indent = " ".repeat(column);
  const insertedText = `${commentLine}\n${indent}`;
  return {
    startPos: range.start.index,
    endPos: range.start.index,
    insertedText,
  };
}

/**
 * True if the node (or the line preceding it) already carries a sentinel of
 * the given tier. Use from every entry script so second runs never duplicate
 * markers.
 */
export function hasReviewSentinel<T extends TypesMap>(
  source: string,
  node: SgNode<T>,
  needle?: string,
): boolean {
  return hasSentinel(source, node as unknown as AnyNode, REVIEW_PREFIX, needle);
}

export function hasTodoSentinel<T extends TypesMap>(
  source: string,
  node: SgNode<T>,
  needle?: string,
): boolean {
  return hasSentinel(source, node as unknown as AnyNode, TODO_PREFIX, needle);
}

function hasSentinel(source: string, node: AnyNode, prefix: string, needle?: string): boolean {
  const lineStart = findLineStart(source, node.range().start.index);
  const precedingLines = source.slice(0, lineStart).split("\n").slice(-6);
  for (const line of precedingLines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(prefix)) continue;
    if (needle && !trimmed.includes(needle)) continue;
    return true;
  }
  return false;
}

function findLineStart(source: string, idx: number): number {
  const before = source.slice(0, idx);
  const nl = before.lastIndexOf("\n");
  return nl === -1 ? 0 : nl + 1;
}
