import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Navbar from "./components/Navbar";
import NavbarWrapper from "./components/NavbarWrapper";
import Footer from "./components/Footer";
import FooterWrapper from "./components/FooterWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import AnnouncementBar from "./components/AnnouncementBar";
import AnnouncementWrapper from "./components/AnnouncementWrapper";
import QueryProvider from "./components/QueryProvider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "SL Business Index",
  description: "The heart of Sri Lankan commerce.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body
        className={`${outfit.variable} antialiased`}
      >
        <QueryProvider>
          <ThemeProvider>
            <AnnouncementWrapper>
              <AnnouncementBar />
            </AnnouncementWrapper>
            <NavbarWrapper>
              <Navbar />
            </NavbarWrapper>
            <main>{children}</main>
            <FooterWrapper>
              <Footer />
            </FooterWrapper>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
