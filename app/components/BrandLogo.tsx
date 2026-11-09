import Image from "next/image";

type BrandLogoProps = {
  tone?: "light" | "dark";
  compact?: boolean;
  className?: string;
};

/**
 * The public SL Business Index identity: one responsive wordmark shared by
 * navigation, footer and authentication screens. No runtime logo overrides.
 */
export default function BrandLogo({
  tone = "light",
  compact = false,
  className = "",
}: BrandLogoProps) {
  const inverse = tone === "dark";

  return (
    <span className={`inline-flex max-w-full select-none items-center gap-2.5 sm:gap-3 ${className}`}>
      <Image
        src="/slbi-mark.svg"
        alt=""
        width={compact ? 42 : 48}
        height={compact ? 42 : 48}
        className="h-[42px] w-[42px] shrink-0 sm:h-12 sm:w-12"
        unoptimized
      />
      <span className="flex min-w-0 flex-col justify-center" style={{ fontFamily: "var(--font-manrope), var(--font-inter), sans-serif" }}>
        <span className={`block whitespace-nowrap text-[15px] font-extrabold leading-[1.17] tracking-[-0.065em] sm:text-[18px] ${inverse ? "text-[#F9F7EF]" : "text-[#1B3430]"}`}>
          SL Business
        </span>
        <span className="mt-[5px] flex items-center gap-2">
          <span className={`text-[10px] font-extrabold leading-none tracking-[0.28em] sm:text-[11px] ${inverse ? "text-[#EAC48E]" : "text-[#A47C46]"}`}>
            INDEX
          </span>
          <span aria-hidden="true" className={`h-px w-6 sm:w-9 ${inverse ? "bg-[#D4BD90]/50" : "bg-[#C6B69B]/75"}`} />
        </span>
      </span>
    </span>
  );
}
