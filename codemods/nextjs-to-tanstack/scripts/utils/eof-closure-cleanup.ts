/**
 * Collapses erroneous repeated `};` tails at end of file (e.g. `};};`), which can
 * appear after partial Pages/SSG stripping or bad merges while the rest of the
 * module is a normal component (no `export const Route`).
 *
 * Does not touch lines ending in `});` (typical `createFileRoute(...)()` close).
 */

export function collapseDuplicateTrailingExportClosures(source: string): string {
  return source.replace(/(\}\s*;)(\s*\}\s*;)+\s*$/m, "$1\n");
}
