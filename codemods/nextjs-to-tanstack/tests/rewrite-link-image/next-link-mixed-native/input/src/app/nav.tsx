import Link from "next/link";

export function Nav() {
  return (
    <nav>
      <Link href="#section">Anchor</Link>
      <Link href="mailto:x@y.com">Mail</Link>
      <Link href="/dashboard">App</Link>
    </nav>
  );
}
