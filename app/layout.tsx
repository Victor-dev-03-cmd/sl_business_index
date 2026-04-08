import { Outfit } from "next/font/google";
import RootClientLayout from "./RootClientLayout";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: 'swap',
});

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
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <RootClientLayout>
          {children}
        </RootClientLayout>
      </body>
    </html>
  );
}
