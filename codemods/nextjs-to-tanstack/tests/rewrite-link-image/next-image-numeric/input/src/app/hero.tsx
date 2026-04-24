import Image from "next/image";

export function Hero() {
  return (
    <div>
      <Image src="/banner.png" alt="banner" width="600" height={400} />
    </div>
  );
}
