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
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import ClarityTracker from "./components/ClarityTracker";
import LiveCounter from "./components/LiveCounter";
import DynamicAppearance from "./components/DynamicAppearance";
import { SessionProvider } from "./components/SessionContext"; // Corrected import
import LoadingProvider from "./components/LoadingProvider";
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
        <ClarityTracker />
        <QueryProvider>
          <DynamicAppearance />
          <SessionProvider> {/* Changed from SessionManager */}
            <ThemeProvider>
              <LoadingProvider>
                <AnnouncementWrapper>
                  <AnnouncementBar />
                </AnnouncementWrapper>
                <NavbarWrapper>
                  <Navbar />
                </NavbarWrapper>
                <main>{children}</main>
                <GlobalAnnouncement />
                <FooterWrapper>
                  <Footer />
                </FooterWrapper>
              </LoadingProvider>
            </ThemeProvider>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}