import { useRouter } from "next/router";

export function Page() {
  const r = useRouter();
  return <div>{r.pathname}</div>;
}
