import type { Metadata } from "next";
import { Suspense } from "react";
import BusinessNewsClient from "./BusinessNewsClient";

export const metadata: Metadata = {
  title: "Business News | Sri Lanka Business Stories & Official Updates | SL Business Index",
  description: "Read official SL Business Index announcements, industry news, business stories, posters and opportunities from verified Sri Lankan publishers.",
  openGraph: {
    title: "Business News | SL Business Index",
    description: "Official updates and trusted business stories from across Sri Lanka.",
    type: "website",
    url: "https://www.slbusinessindex.com/business-news",
  },
};

export default function BusinessNewsPage() {
  return (
    <Suspense fallback={
      <div role="status" className="flex min-h-[65vh] items-center justify-center bg-[#f8f7f2] px-6 font-[family-name:var(--font-inter)]">
        <div className="max-w-md text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[.25em] text-[#b48b5a]">SL Business Index</p>
          <h1 className="mt-4 font-[family-name:var(--font-inter)] text-[clamp(2.6rem,6vw,4.5rem)] font-bold text-[#1d3829]">Business News</h1>
          <p className="mt-4 text-sm text-[#7a877c]">Preparing the latest edition…</p>
        </div>
      </div>
    }>
      <BusinessNewsClient/>
    </Suspense>
  );
}
