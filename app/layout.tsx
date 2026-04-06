"use client";

import { useState, useEffect } from "react";
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
import DynamicAppearance from "./components/DynamicAppearance";
import { SessionProvider } from "./components/SessionContext";
import LoadingProvider, { LoadingScreen } from "./components/LoadingProvider";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" className={`${outfit.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {!mounted ? (
          <LoadingScreen />
        ) : (
          <LoadingProvider>
            <ClarityTracker />
            <QueryProvider>
              <Toaster richColors closeButton position="bottom-right" />
              <DynamicAppearance />
              <SessionProvider>
                <ThemeProvider>
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
                </ThemeProvider>
              </SessionProvider>
            </QueryProvider>
          </LoadingProvider>
        )}
      </body>
    </html>
  );
}
