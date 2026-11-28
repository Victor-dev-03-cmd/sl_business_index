'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,type ComponentProps} from 'react';
import {canPrefetch,createPrefetchBudget,eligiblePublicRoute,type NetworkHint} from '@/lib/navigation/prefetch-policy';
const reserve=createPrefetchBudget();
type Props=Omit<ComponentProps<typeof Link>,'href'|'prefetch'>&{href:string};
export default function SmartPrefetchLink({href,onPointerEnter,onPointerDown,onFocus,...props}:Props){
 const router=useRouter();
 const anchor=useRef<HTMLAnchorElement>(null);
 const warm=()=>{
  const net=(navigator as Navigator&{connection?:NetworkHint}).connection;
  if(!canPrefetch(net,navigator.onLine,document.visibilityState==='visible')||!reserve(href,Date.now()))return;
  router.prefetch(href);
 };
 const latest=useRef(warm);latest.current=warm;
 useEffect(()=>{
  const node=anchor.current;
  if(!node||!eligiblePublicRoute(href)||typeof IntersectionObserver==='undefined')return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const observer=new IntersectionObserver(entries=>{
   clearTimeout(timer);
   if(entries.some(entry=>entry.isIntersecting))timer=setTimeout(()=>latest.current(),350);
  },{threshold:0.5});
  observer.observe(node);
  return()=>{clearTimeout(timer);observer.disconnect()};
 },[href]);
 return <Link {...props} href={href} ref={anchor} prefetch={false}
  onPointerEnter={e=>{onPointerEnter?.(e);if(!e.defaultPrevented&&e.pointerType==='mouse')warm()}}
  onPointerDown={e=>{onPointerDown?.(e);if(!e.defaultPrevented&&e.button===0)warm()}}
  onFocus={e=>{onFocus?.(e);if(!e.defaultPrevented)warm()}}/>;
}
