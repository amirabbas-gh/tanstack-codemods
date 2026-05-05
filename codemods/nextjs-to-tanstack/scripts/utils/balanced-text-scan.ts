/**
 * Scan plain source text with minimal string / template / comment awareness so
 * `{` / `}` inside literals don't corrupt brace depth (used by API/route repair).
 */

function skipStringLiteral(source: string, start: number, q: "'" | '"'): number {
  let i = start + 1;
  while (i < source.length) {
    const c = source[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === q) return i + 1;
    i++;
  }
  return source.length;
}

function skipBracedTemplateExpression(source: string, innerStart: number): number {
  let i = innerStart;
  let depth = 1;
  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === "'") {
      i = skipStringLiteral(source, i, "'");
      continue;
    }
    if (c === '"') {
      i = skipStringLiteral(source, i, '"');
      continue;
    }
    if (c === "`") {
      i = skipTemplateLiteral(source, i);
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  return i;
}

function skipTemplateLiteral(source: string, start: number): number {
  let i = start + 1;
  while (i < source.length) {
    const c = source[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "`") return i + 1;
    if (c === "$" && source[i + 1] === "{") {
      i = skipBracedTemplateExpression(source, i + 2);
      continue;
    }
    i++;
  }
  return source.length;
}

/** `openBraceIdx` points at `{`; returns index of the matching `}`. */
export function indexOfMatchingBrace(source: string, openBraceIdx: number): number {
  let i = openBraceIdx + 1;
  let depth = 1;
  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === "'") {
      i = skipStringLiteral(source, i, "'");
      continue;
    }
    if (c === '"') {
      i = skipStringLiteral(source, i, '"');
      continue;
    }
    if (c === "`") {
      i = skipTemplateLiteral(source, i);
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      const nl = source.indexOf("\n", i + 2);
      i = nl === -1 ? source.length : nl;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      let j = i + 2;
      while (j < source.length) {
        if (source[j] === "*" && source[j + 1] === "/") {
          j += 2;
          break;
        }
        j++;
      }
      i = j;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  if (depth !== 0) return -1;
  return i - 1;
}
