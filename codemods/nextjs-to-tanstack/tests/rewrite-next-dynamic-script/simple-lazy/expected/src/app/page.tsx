import { lazy } from 'react';

const Other = lazy(() => import("./other"));

export function Page() {
  return <Other />;
}
