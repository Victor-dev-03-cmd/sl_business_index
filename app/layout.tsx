import { Inter, Noto_Sans_Tamil, Noto_Sans_Sinhala } from "next/font/google";
import RootClientLayout from "./RootClientLayout";
import "./globals.css";
import "./public-dark-theme.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Script-specific fallbacks preserve readable Tamil and Sinhala text.
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", display: "swap" });
const sinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], variable: "--font-sinhala", display: "swap" });

export const metadata = {
  title: "SL Business Index - Premium Sri Lankan Directory",
  description: "Discover and connect with Sri Lankan businesses and services across the island.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${tamil.variable} ${sinhala.variable}`} suppressHydrationWarning>
      <head><meta name="theme-color" content="#FCFAF6" data-slbi-theme-color="true" /><script dangerouslySetInnerHTML={{ __html: "(()=>{try{const v=localStorage.getItem('slbi-appearance-v1');const p=v==='dark'||v==='system'?v:'light';const s=location.pathname.split('/')[1];const d=s!=='admin'&&s!=='vendor'&&(p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.dataset.slbiTheme=d?'dark':'light';document.documentElement.dataset.slbiAppearance=p;document.querySelector('meta[data-slbi-theme-color]')?.setAttribute('content',d?'#101010':'#FCFAF6')}catch{}})();" }} /></head>
      <body className="antialiased" suppressHydrationWarning>
        <RootClientLayout>
          {children}
        </RootClientLayout>
      </body>
    </html>
  );
}
