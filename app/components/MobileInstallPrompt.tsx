"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Check, EllipsisVertical, PlusSquare, Share2, X } from "lucide-react";

type Platform = "ios" | "android" | null;
type View = "closed" | "banner" | "instructions";
type InstallChoice = { outcome: "accepted" | "dismissed" };
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const INSTALLED_KEY = "slbi:pwa:installed:v1";
const DISMISSED_UNTIL_KEY = "slbi:pwa:dismissed-until:v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writePreference(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ }
}
function isStandalone(): boolean {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    iosNavigator.standalone === true;
}
function getPlatform(): Platform {
  const userAgent = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return null;
}

/**
 * Lightweight, client-only install education for public phone browsers.
 * Android invokes the browser install API when it is available.
 * iOS has no install-completed event in Safari, so a manual confirmation is
 * offered in addition to standalone display-mode detection.
 */
export default function MobileInstallPrompt() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<Platform>(null);
  const [view, setView] = useState<View>("closed");
  const [prompting, setPrompting] = useState(false);
  const deferredInstall = useRef<InstallEvent | null>(null);

  const privatePrefixes = [
    "/vendor", "/admin", "/auth", "/login", "/signup",
    "/forgot-password", "/reset-password", "/update-password",
  ];
  const publicRoute = !privatePrefixes.some(
    route => pathname === route || pathname.startsWith(route + "/")
  );

  useEffect(() => {
    if (!publicRoute || !window.matchMedia("(max-width: 639px)").matches) {
      setView("closed");
      return;
    }

    if (isStandalone()) {
      writePreference(INSTALLED_KEY, "1");
      setView("closed");
      return;
    }

    const device = getPlatform();
    if (!device || readPreference(INSTALLED_KEY) === "1") {
      setView("closed");
      return;
    }
    setPlatform(device);

    const dismissedUntil = Number(readPreference(DISMISSED_UNTIL_KEY) || 0);
    if (dismissedUntil > Date.now()) {
      setView("closed");
      return;
    }

    // Show after the page settles, without shifting the native Home layout.
    const timer = window.setTimeout(() => {
      const drawerOpen = document.querySelector(
        'button[aria-label="Close account and navigation menu"][aria-expanded="true"]'
      );
      if (!drawerOpen && !isStandalone()) setView("banner");
    }, 1200);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredInstall.current = event as InstallEvent;
    };
    const onInstalled = () => {
      writePreference(INSTALLED_KEY, "1");
      deferredInstall.current = null;
      setView("closed");
    };
    const onVisibilityChange = () => {
      if (!document.hidden && isStandalone()) onInstalled();
    };
    const onMenuOpen = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element &&
          target.closest('button[aria-label="Open account and navigation menu"]')) {
        setView("closed");
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("click", onMenuOpen, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("click", onMenuOpen, true);
    };
  }, [pathname, publicRoute]);

  const dismiss = () => {
    writePreference(DISMISSED_UNTIL_KEY, String(Date.now() + WEEK_MS));
    setView("closed");
  };
  const markInstalled = () => {
    writePreference(INSTALLED_KEY, "1");
    setView("closed");
  };
  const install = async () => {
    const browserPrompt = deferredInstall.current;
    if (platform !== "android" || !browserPrompt) {
      setView("instructions");
      return;
    }
    deferredInstall.current = null;
    setPrompting(true);
    try {
      await browserPrompt.prompt();
      const choice = await browserPrompt.userChoice;
      // Only appinstalled (or explicit user confirmation) marks completion.
      if (choice.outcome === "accepted") {
        writePreference(DISMISSED_UNTIL_KEY, String(Date.now() + WEEK_MS));
        setView("closed");
      } else {
        dismiss();
      }
    } catch {
      setView("instructions");
    } finally {
      setPrompting(false);
    }
  };

  if (!publicRoute || !platform || view === "closed") return null;

  return (
    <aside
      data-slbi-install-nudge="true"
      aria-label="Install SL Business Index"
      className="fixed left-1/2 z-[1250] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 rounded-[20px] border border-[#E2EAE5] bg-white text-[#1B2925] shadow-[0_14px_42px_rgba(8,27,18,.2)] sm:hidden"
      style={{ bottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}
    >
      {view === "banner" ? (
        <div className="p-3 min-[380px]:p-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button" onClick={dismiss} aria-label="Dismiss install suggestion"
              className="flex h-9 w-7 shrink-0 items-center justify-center text-[#89958D]"
            >
              <X size={21} />
            </button>
            <Image src="/icons/pwa-192.png" alt="" width={52} height={52}
              className="h-[52px] w-[52px] shrink-0 rounded-[12px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-[1.3] tracking-[-.025em] min-[380px]:text-[16px]">
                Add to Home Screen
              </p>
              <p className="mt-1 text-[11px] leading-[1.35] text-[#6C7771] min-[380px]:text-[12px]">
                Quick access to SL Business Index
              </p>
            </div>
            <button
              type="button" onClick={install} disabled={prompting}
              className="hidden h-[42px] shrink-0 items-center justify-center rounded-full bg-[#235B45] px-3.5 text-[12px] font-semibold text-white disabled:opacity-60 min-[410px]:inline-flex"
            >
              {prompting ? "Opening…" : "Install App"}
            </button>
          </div>
          <button type="button" onClick={install} disabled={prompting}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-[#235B45] text-[13px] font-semibold text-white disabled:opacity-60 min-[410px]:hidden">
            {prompting ? "Opening…" : "Install App"}
          </button>
        </div>
      ) : (
        <div className="relative px-5 pb-4 pt-5 text-center">
          <button type="button" aria-label="Close installation instructions" onClick={dismiss}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F3F0] text-[#8A9791]">
            <X size={18} />
          </button>
          <Image src="/icons/pwa-192.png" alt="" width={58} height={58}
            className="mx-auto h-[58px] w-[58px] rounded-[14px]" />
          <h2 className="mt-3 text-[19px] font-semibold tracking-[-.04em]">
            Install SL Business Index
          </h2>
          <ol className="mx-auto mt-4 max-w-[350px] space-y-3 text-left text-[13px] leading-[1.45]">
            {platform === "ios" ? (
              <>
                <li className="flex items-start gap-2.5">
                  <Share2 size={19} className="mt-0.5 shrink-0 text-[#245C46]" />
                  <span>1. Tap <strong>Share</strong> in your browser.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PlusSquare size={19} className="mt-0.5 shrink-0 text-[#245C46]" />
                  <span>2. Choose <strong>Add to Home Screen</strong>, then tap Add.</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2.5">
                  <EllipsisVertical size={19} className="mt-0.5 shrink-0 text-[#245C46]" />
                  <span>1. Open your browser menu (⋮).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PlusSquare size={19} className="mt-0.5 shrink-0 text-[#245C46]" />
                  <span>2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                </li>
              </>
            )}
          </ol>
          <button type="button" onClick={dismiss}
            className="mt-5 flex h-[45px] w-full items-center justify-center rounded-full bg-[#235B45] text-[14px] font-semibold text-white">
            Got it
          </button>
          <button type="button" onClick={markInstalled}
            className="mx-auto mt-3 inline-flex min-h-8 items-center gap-1.5 text-[12px] font-medium text-[#396B56] underline underline-offset-2">
            <Check size={14} /> I&apos;ve added it to my Home Screen
          </button>
        </div>
      )}
    </aside>
  );
}
