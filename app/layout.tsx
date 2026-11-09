import { Inter, Manrope, Noto_Sans_Tamil, Noto_Sans_Sinhala } from "next/font/google";
import RootClientLayout from "./RootClientLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Distinctive Manrope wordmark, while Inter remains the product UI typeface.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

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
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${tamil.variable} ${sinhala.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <RootClientLayout>
          {children}
        </RootClientLayout>
      </body>
    </html>
  );
}
