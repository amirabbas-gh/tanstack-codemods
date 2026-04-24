// Local function named Link — should NOT be touched by R4.
function Link(props: { to: string; children: string }) {
  return <a href={props.to}>{props.children}</a>;
}

export function Nav() {
  return <Link to="/home">Home</Link>;
}
