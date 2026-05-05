import dynamic from "next/dynamic";

const Other = dynamic(() => import("./other"), {
  loading: () => <p>wait</p>,
});

export function Page() {
  return <Other />;
}
