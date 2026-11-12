import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & FAQ | SLBI 2.0 GrowthOS | SL Business Index",
  description: "Get answers about Sri Lankan business discovery, listing registration, verification, vendor tools, subscriptions, privacy and the phased SLBI 2.0 Growth & Security OS roadmap.",
  alternates: { canonical: "https://www.slbusinessindex.com/faq" },
  openGraph: {
    title: "Help & FAQ — SLBI 2.0",
    description: "Helpful answers for businesses, customers and the next generation of SL Business Index.",
    url: "https://www.slbusinessindex.com/faq",
    type: "website",
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
