import Link from "next/link";
import BrandLogo from "./BrandLogo";

type LogoLinkProps = {
  className?: string;
  tone?: "light" | "dark";
  compact?: boolean;
};

export default function LogoLink({
  className = "",
  tone = "light",
  compact = false,
}: LogoLinkProps) {
  return (
    <Link
      href="/"
      aria-label="SL Business Index — Home"
      className={`inline-flex max-w-full items-center rounded-lg outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#A47C46] focus-visible:ring-offset-2 ${className}`}
    >
      <BrandLogo tone={tone} compact={compact} />
    </Link>
  );
}
