import { Link } from '@tanstack/react-router';

export function Nav() {
  return (
    <nav>
      <Link to="/dashboard" className="nav-link">Dashboard</Link>
      <Link to="/about">About</Link>
    </nav>
  );
}
