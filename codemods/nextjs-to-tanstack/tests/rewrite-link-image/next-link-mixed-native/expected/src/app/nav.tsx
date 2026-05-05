import { Link } from '@tanstack/react-router';

export function Nav() {
  return (
    <nav>
      <a href="#section">Anchor</a>
      <a href="mailto:x@y.com">Mail</a>
      <Link to="/dashboard">App</Link>
    </nav>
  );
}
