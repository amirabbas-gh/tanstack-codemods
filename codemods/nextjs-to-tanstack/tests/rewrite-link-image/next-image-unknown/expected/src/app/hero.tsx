import { Image } from '@unpic/react';

export function Hero() {
  return (
    <div>
      // CODEMOD: review — next/image → unpic: width="auto" is non-numeric; unpic expects number
      // CODEMOD: review — next/image → unpic: height="auto" is non-numeric; unpic expects number
      <Image src="/logo.png" alt="logo" width="auto" height="auto" />
    </div>
  );
}
