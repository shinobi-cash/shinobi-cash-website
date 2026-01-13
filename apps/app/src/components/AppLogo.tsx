import Image from "next/image";
import Link from "next/link";

export default function AppLogo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src="/Shinobi.Cash-white-text.png"
        alt="Shinobi Cash"
        width={144}
        height={32}
        className="block h-8 w-auto md:hidden"
        priority
      />
      <Image
        src="/Shinobi.Cash-white-text.png"
        alt="Shinobi Cash"
        width={180}
        height={40}
        className="hidden h-10 w-auto md:block"
        priority
      />
    </Link>
  );
}
