"use client";

import { useEffect } from "react";
import Navbar from "./components/Navbar";
import { LivePresenceProvider } from "./components/LivePresenceProvider";
import Footer from "./components/Footer";
import NavbarWrapper from "./components/NavbarWrapper";
import FooterWrapper from "./components/FooterWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import AnnouncementBar from "./components/AnnouncementBar";
import AnnouncementWrapper from "./components/AnnouncementWrapper";
import QueryProvider from "./components/QueryProvider";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import ClarityTracker from "./components/ClarityTracker";
import GoogleAnalyticsTracker from "./components/GoogleAnalyticsTracker";
import DynamicAppearance from "./components/DynamicAppearance";
import { SessionProvider } from "./components/SessionContext";
import LoadingProvider from "./components/LoadingProvider";
import IconsaxRegistry from "./components/IconsaxRegistry";
import MobilePublicDock from "./components/MobilePublicDock";
import MobileInstallPrompt from "./components/MobileInstallPrompt";
import SiteToaster from "./components/SiteToaster";

export default function RootClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch((err) => console.error('SW registration failed:', err))
    }
  }, []);

  return (
    <>
      <noscript>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#0F172A', marginBottom: '1rem' }}>SL Business Index</h1>
          <p style={{ color: '#64748B', marginBottom: '2rem' }}>Please enable JavaScript to view the full version of our site.</p>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
            <a href="/nearby" style={{ padding: '1rem', background: '#0F172A', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>Browse Businesses</a>
            <a href="/category" style={{ padding: '1rem', background: '#D4AF37', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>View Categories</a>
          </div>
        </div>
      </noscript>
      <LoadingProvider>
          <IconsaxRegistry />
          <ClarityTracker />
          <GoogleAnalyticsTracker />
          <QueryProvider>
            <SiteToaster />
            <DynamicAppearance />
            <SessionProvider>
              <ThemeProvider>
                <LivePresenceProvider>
                <AnnouncementWrapper>
                  <AnnouncementBar />
                </AnnouncementWrapper>
                <NavbarWrapper>
                  <Navbar />
                </NavbarWrapper>
                {/* Render the viewport dock before potentially streaming page
                    content, not after a long homepage and footer. */}
                <MobilePublicDock />
                <MobileInstallPrompt />
                <main>{children}</main>
                <GlobalAnnouncement />
                <FooterWrapper>
                  <Footer />
                </FooterWrapper>
                <MobilePublicDock role="spacer" />
              </LivePresenceProvider>
              </ThemeProvider>
            </SessionProvider>
          </QueryProvider>
        </LoadingProvider>
    </>
  );
}
