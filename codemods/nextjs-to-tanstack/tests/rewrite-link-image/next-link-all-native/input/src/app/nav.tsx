import Link from "next/link";

export function Nav() {
  return (
    <nav>
      <Link href="#top">Top</Link>
      <Link href="https://example.com">Ext</Link>
    </nav>
  );
}
