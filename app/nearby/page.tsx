"use client";

import { Suspense } from "react";
import { Compass } from "lucide-react";
import NearbyExplorer from "./NearbyExplorer";

function NearbyPageLoading() {
  return (
    <div className="flex h-[100dvh] flex-col bg-[#F7FAFD]">
      <div className="flex h-[62px] shrink-0 items-center gap-3 border-b border-[#E1EAF1] bg-white px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E3659] text-[#B5DFF9]">
          <Compass size={21} />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#123653]">Nearby Explorer</h1>
          <p className="text-xs text-[#7B97AA]">Discover businesses across Sri Lanka</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[60%] shrink-0 space-y-3 xl:w-[62%] border-r border-[#DFE9F1] bg-white p-6 md:block">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-[112px] animate-pulse rounded-[10px] bg-[#EDF3F8]" />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center bg-[#E6F0F7]">
          <div className="flex flex-col items-center gap-3 text-[#5284A7]">
            <Compass size={32} strokeWidth={1.4} />
            <span className="text-sm font-medium">Preparing your explorer…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NearbyPage() {
  return (
    <Suspense fallback={<NearbyPageLoading />}>
      <NearbyExplorer />
    </Suspense>
  );
}
