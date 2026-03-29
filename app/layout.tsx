import type { Metadata, Viewport } from "next";
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
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    template: "%s | SLBI - SL Business Index",
    default: "SLBI - SL Business Index | Businesses in Sri Lanka",
  },
  description: "SLBI (SL Business Index) is the ultimate directory for businesses in Sri Lanka. Discover and connect with verified local businesses, services, and SL business opportunities across the island.",
  keywords: ["SLBI", "SL Business Index", "SL Business", "Businesses in Sri Lanka", "Sri Lanka Business Directory", "Local Services", "Commerce", "Colombo Businesses"],
  authors: [{ name: "SL Business Index" }],
  metadataBase: new URL("https://slbusinessindex.com"),
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: "https://slbusinessindex.com",
    siteName: "SL Business Index",
    title: "SL Business Index | The Heart of Sri Lankan Commerce",
    description: "Discover and connect with the best local businesses in Sri Lanka. Your most advanced digital business directory.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SL Business Index",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SL Business Index | The Heart of Sri Lankan Commerce",
    description: "Discover and connect with the best local businesses in Sri Lanka. Your most advanced digital business directory.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ClarityTracker />
        <QueryProvider>
          <Toaster richColors closeButton position="bottom-right" />
          <DynamicAppearance />
          <SessionProvider>
            {" "}
            {/* Changed from SessionManager */}
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
