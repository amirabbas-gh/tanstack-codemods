/**
 * When a route file moves one directory deeper (e.g. `app/x.tsx` → `app/{-$locale}/x.tsx`),
 * static import paths using `../` must gain one extra `../` segment.
 */

export function deepenRelativeParentImports(source: string): string {
  let s = source.replace(
    /(\bfrom\s+["'])((?:\.\.\/)+)/g,
    (_full, prefix: string, segs: string) => `${prefix}../${segs}`,
  );
  s = s.replace(
    /(\bimport\s+["'])((?:\.\.\/)+)/g,
    (_full, prefix: string, segs: string) => `${prefix}../${segs}`,
  );
  s = s.replace(
    /(\bimport\s*\(\s*["'])((?:\.\.\/)+)/g,
    (_full, prefix: string, segs: string) => `${prefix}../${segs}`,
  );
  return s;
}
