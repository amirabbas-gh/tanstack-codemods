import Link from "next/link";

export function Nav() {
  return (
    <nav>
      <Link href="/dashboard" className="nav-link">Dashboard</Link>
      <Link href="/about">About</Link>
    </nav>
  );
}
