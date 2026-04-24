import { Link as NextLink } from '@tanstack/react-router';

export function Nav() {
  return (
    <NextLink to="/home" className="nav">Home</NextLink>
  );
}
