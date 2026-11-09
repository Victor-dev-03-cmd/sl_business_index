"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
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
  const { data: settings } = useQuery({
    queryKey: ["site-settings", "general"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings")
        .select("logo_url, logo_text, logo_width, logo_height")
        .eq("id", 1).single();
      return error ? null : data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Existing database logo uploads belonged to the old blue identity.
  // Only explicitly new uploads made after the rebrand opt in to override it.
  const customLogo = settings?.logo_url?.includes("slbi-brand-v2=1")
    ? settings.logo_url
    : null;

  return (
    <Link
      href="/"
      aria-label="SL Business Index — Home"
      className={`inline-flex max-w-full items-center rounded-lg outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#A47C46] focus-visible:ring-offset-2 ${className}`}
    >
      {customLogo ? (
        <span className={tone === "dark" ? "rounded-xl bg-[#F6F3ED] px-2 py-1" : ""}>
          <Image
            src={customLogo}
            alt={settings?.logo_text || "SL Business Index"}
            width={settings?.logo_width || 205}
            height={settings?.logo_height || 54}
            className="max-h-[60px] max-w-full object-contain"
            style={{ width: "auto", height: "auto", maxWidth: "230px" }}
            priority
          />
        </span>
      ) : (
        <BrandLogo tone={tone} compact={compact} />
      )}
    </Link>
  );
}
