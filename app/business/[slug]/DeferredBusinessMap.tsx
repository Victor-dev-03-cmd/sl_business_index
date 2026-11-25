"use client";

import {useEffect,useRef,useState} from "react";
import dynamic from "next/dynamic";
import type {Business} from "@/lib/types";

// Import the Leaflet bundle and render tiles ONLY near the map viewport.
// This avoids paying the map/marker memory cost on every business-profile open.
const LeafletMap=dynamic(()=>import("@/components/LeafletMap"),{
  ssr:false,
  loading:()=> <div role="status" className="grid h-full place-items-center bg-neutral-100 text-xs text-neutral-500">
    Loading map…
  </div>,
});

export default function DeferredBusinessMap({
  lat,lng,business,
}:{lat:number;lng:number;business:Business}){
  const container=useRef<HTMLDivElement|null>(null);
  const [inView,setInView]=useState(false);
  useEffect(()=>{
    const node=container.current;
    if(!node)return;
    if(typeof IntersectionObserver==='undefined'){setInView(true);return;}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        setInView(true);
        observer.disconnect();
      }
    },{rootMargin:"200px 0px"});
    observer.observe(node);
    return()=>observer.disconnect();
  },[business.id]);

  return <div ref={container}
    data-slbi-deferred-map="true"
    className="relative isolate z-0 mt-3 h-[250px] w-full overflow-hidden rounded-xl border border-neutral-200">
    {inView
      ?<LeafletMap centerLat={lat} centerLng={lng} businesses={[business]} zoom={15}
        height="100%" showUserLocation={false} enableClustering={false}
        wrapperClassName="relative isolate z-0 h-full w-full overflow-hidden"/>
      :<div aria-hidden="true" className="grid h-full place-items-center bg-neutral-100 text-xs text-neutral-500">
        Map loads when you reach this section
      </div>}
  </div>;
}
