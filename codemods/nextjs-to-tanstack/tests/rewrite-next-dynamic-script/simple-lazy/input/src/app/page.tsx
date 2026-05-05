import dynamic from "next/dynamic";

const Other = dynamic(() => import("./other"));

export function Page() {
  return <Other />;
}
