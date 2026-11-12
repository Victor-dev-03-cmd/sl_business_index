import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sri Lanka Public Service Contacts by District | Contact SL Business Index",
  description: "Find official-source Sri Lankan electricity (1987), Jaffna & Batticaloa regional offices, police, water, bank and government numbers. Contact SLBI via WhatsApp.",
  keywords: [
    "Sri Lanka public service phone directory", "Jaffna electricity board number",
    "EDL Jaffna contact", "Batticaloa electricity office", "Kilinochchi EDL hotline",
    "CEB hotline 1987", "Sri Lanka Police 119", "1990 ambulance",
    "People's Bank hotline", "Sri Lanka district office contacts",
    "SL Business Index contact",
  ],
  alternates: { canonical: "https://www.slbusinessindex.com/contact" },
  openGraph: {
    title: "Official-source Sri Lankan public contacts & SLBI support",
    description: "Find verified-source district, regional and national office numbers across Sri Lanka—plus a direct way to contact SL Business Index.",
    type: "website",
    url: "https://www.slbusinessindex.com/contact",
  },
  robots: { index: true, follow: true },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
