"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";

/**
 * White, branded boot transition. One second maximum intentional delay;
 * the actual app mounts immediately behind the overlay so auth, data
 * hydration and navigation can initialize in parallel.
 */
export default function LoadingProvider({ children }: { children: ReactNode }) {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowIntro(false), 1000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {/* Required for pages that use useSearchParams during static prerender. */}
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
      {showIntro && <LoadingScreen />}
    </>
  );
}

export function LoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Loading SL Business Index"
      aria-live="polite"
      className="slbi-boot-overlay fixed inset-0 z-[9999] flex min-h-[100dvh] w-full items-center justify-center bg-white px-5"
    >
      <div className="flex w-full max-w-[370px] flex-col items-center text-center">
        <div className="relative flex h-[118px] w-[118px] items-center justify-center">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated SL Business Index loading progress"
          >
            <circle cx="60" cy="60" r="54" stroke="#E9EDE6" strokeWidth="2.5" />
            <circle
              className="slbi-boot-progress"
              cx="60" cy="60" r="54"
              stroke="#2F765C" strokeWidth="3.5"
              strokeLinecap="round" strokeDasharray="339.3"
              strokeDashoffset="339.3"
              transform="rotate(-90 60 60)"
            />
            <circle cx="60" cy="6" r="3.2" fill="#DBAD74" className="slbi-boot-glow" />
          </svg>
          <div className="slbi-boot-mark relative h-[69px] w-[69px]">
            <Image src="/slbi-mark.svg" width={69} height={69} alt="" priority
              className="h-full w-full object-contain" unoptimized />
          </div>
        </div>

        <div className="slbi-boot-wordmark mt-7">
          <p
            className="text-[22px] font-extrabold leading-none tracking-[-0.055em] text-[#1B3430] sm:text-[25px]"
            style={{ fontFamily: "var(--font-manrope), var(--font-inter), sans-serif" }}
          >
            SL Business Index
          </p>
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.27em] text-[#AA885E]">
            Discover · Connect · Grow
          </p>
        </div>

        <div className="mt-9 h-[3px] w-[164px] overflow-hidden rounded-full bg-[#E9EDE6]">
          <div className="slbi-boot-bar h-full w-full origin-left rounded-full bg-gradient-to-r from-[#2F765C] via-[#82B296] to-[#D6AB73]" />
        </div>
        <p className="mt-3 text-[10px] font-medium tracking-[0.10em] text-[#9EAAA2]">
          Preparing your experience
        </p>
      </div>

      <style jsx global>{`
        .slbi-boot-overlay { animation: slbi-boot-exit 160ms ease-out 840ms both; }
        .slbi-boot-progress { animation: slbi-boot-draw 840ms cubic-bezier(.22,.86,.31,1) both; }
        .slbi-boot-glow { animation: slbi-boot-glow 840ms ease-in-out both; }
        .slbi-boot-mark { animation: slbi-boot-reveal 600ms cubic-bezier(.21,.91,.35,1.1) both; }
        .slbi-boot-wordmark { animation: slbi-boot-rise 520ms ease-out 130ms both; }
        .slbi-boot-bar { animation: slbi-boot-fill 850ms cubic-bezier(.19,.95,.4,1) both; }
        @keyframes slbi-boot-draw { from { stroke-dashoffset: 339.3; } to { stroke-dashoffset: 0; } }
        @keyframes slbi-boot-glow { 0% { opacity: .2; } 60% { opacity: 1; } 100% { opacity: .65; } }
        @keyframes slbi-boot-reveal { from { opacity: 0; transform: scale(.86) rotate(-7deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes slbi-boot-rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slbi-boot-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes slbi-boot-exit { 0% { opacity: 1; } 100% { opacity: 0; visibility: hidden; } }
        @media (prefers-reduced-motion: reduce) {
          .slbi-boot-progress, .slbi-boot-glow, .slbi-boot-mark,
          .slbi-boot-wordmark, .slbi-boot-bar { animation: none !important; }
          .slbi-boot-progress { stroke-dashoffset: 0; }
          .slbi-boot-overlay { animation: slbi-boot-exit 160ms linear 840ms both; }
        }
      `}</style>
    </div>
  );
}
