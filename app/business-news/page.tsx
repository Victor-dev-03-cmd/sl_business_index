import type { Metadata } from "next";
import { Suspense } from "react";
import BusinessNewsClient from "./BusinessNewsClient";

export const metadata: Metadata = {
  title: "Business Journal | Sri Lankan Business News, Stories & Opportunities | SL Business Index",
  description: "Discover articles, photo posters, announcements, hiring and opportunities contributed by verified Sri Lankan businesses.",
  openGraph: {
    title: "The Business Journal | SL Business Index",
    description: "Stories, business news and opportunities from verified Sri Lankan business owners.",
    type: "website",
    url: "https://www.slbusinessindex.com/business-news",
  },
};

export default function BusinessNewsPage() {
  return (
    <Suspense fallback={
      <div role="status" className="flex min-h-[65vh] items-center justify-center bg-[#f8f7f2] px-6">
        <div className="max-w-md text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[.25em] text-[#b48b5a]">SL Business Index</p>
          <h1 className="mt-4 font-serif text-[clamp(2.6rem,6vw,4.5rem)] font-bold text-[#1d3829]">The Business Journal.</h1>
          <p className="mt-4 text-sm text-[#7a877c]">Preparing the latest edition…</p>
        </div>
      </div>
    }>
      <BusinessNewsClient/>
    </Suspense>
  );
}
