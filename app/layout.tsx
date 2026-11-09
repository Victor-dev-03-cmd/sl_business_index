import { Inter, Noto_Sans_Tamil, Noto_Sans_Sinhala } from "next/font/google";
import RootClientLayout from "./RootClientLayout";
import "./globals.css";

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
  description: "Explore verified local businesses, clinics, and luxury villas across Sri Lanka.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${tamil.variable} ${sinhala.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <RootClientLayout>
          {children}
        </RootClientLayout>
      </body>
    </html>
  );
}
