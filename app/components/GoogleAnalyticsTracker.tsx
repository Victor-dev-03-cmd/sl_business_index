'use client'
import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'

type Consent = 'allow'|'deny'|null
import {analyticsConsentKey as KEY,analyticsConsentEvent as EVENT} from '@/lib/live/presence-geo'
const id=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID||''
type GAWindow=Window & {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void}
function publicPath(path:string){
  return !/^\/(?:admin|vendor|auth|login|signup|register|reset-password|account|profile|settings)(?:\/|$|-)/i.test(path)
}
function preference():Consent{
  try{const value=localStorage.getItem(KEY);return value==='allow'||value==='deny'?value:null}catch{return null}
}
function setPreference(value:Consent){
  try{if(value===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,value)}catch{}
  window.dispatchEvent(new CustomEvent(EVENT,{detail:value}))
}
export function openAnalyticsPreferences(){setPreference(null)}

export default function GoogleAnalyticsTracker(){
  const path=usePathname()||'/'
  const [consent,setConsent]=useState<Consent>(null)
  const [initialized,setInitialized]=useState(false)
  const [blocked,setBlocked]=useState(false)
  const valid=/^G-[A-Z0-9]+$/.test(id)
  const allowedRoute=publicPath(path)
  useEffect(()=>{
    const nav=navigator as Navigator & {globalPrivacyControl?:boolean}
    const privacy=nav.doNotTrack==='1'||nav.globalPrivacyControl===true
    setBlocked(privacy);setConsent(preference());setInitialized(true)
    const sync=(event:Event)=>{const detail=(event as CustomEvent<Consent>).detail;setConsent(detail==='allow'||detail==='deny'?detail:preference())}
    window.addEventListener(EVENT,sync);window.addEventListener('storage',sync)
    return()=>{window.removeEventListener(EVENT,sync);window.removeEventListener('storage',sync)}
  },[])
  useEffect(()=>{
    if(!valid||!initialized)return
    const w=window as GAWindow
    const flags=w as unknown as Record<string,unknown>
    const enabled=consent==='allow'&&!blocked&&allowedRoute
    flags['ga-disable-'+id]=!enabled
    if(!enabled){
      w.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})
      return
    }
    if(!w.gtag){
      w.dataLayer=w.dataLayer||[]
      w.gtag=function(){w.dataLayer?.push(arguments)}
      w.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})
      w.gtag('js',new Date())
      w.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+'/',page_referrer:'',page_title:'SL Business Index'})
      const script=document.createElement('script')
      script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id)
      script.id='slbi-ga4-script';document.head.appendChild(script)
    }
    w.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})
    // Count page activity without sending the URL path, query, title, account
    // identifier, search text, form data, GPS or business owner details.
    w.gtag('event','page_view',{send_to:id,page_location:location.origin+'/',page_referrer:'',page_title:'SL Business Index'})
    return()=>{flags['ga-disable-'+id]=true}
  },[path,consent,blocked,initialized,allowedRoute,valid])
  if(!valid||!initialized||blocked||!allowedRoute||consent!==null)return null
  return <aside role="region" aria-label="Analytics preferences" data-slbi-ui="analytics-preferences" className="fixed bottom-[84px] left-3 right-3 z-[80] mx-auto max-w-[460px] rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-lg sm:bottom-5 sm:left-auto sm:right-5">
    <p className="font-semibold">Help us understand visitor activity</p>
    <p className="mt-1 text-xs leading-5 text-slate-600">Optional analytics also shares your approximate country or Sri Lankan province in Live Visitors while you are active. No exact location or identity is shown. <a href="/privacy-policy" className="underline">Privacy policy</a>.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={()=>{setConsent('deny');setPreference('deny')}} className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold">No thanks</button>
      <button onClick={()=>{setConsent('allow');setPreference('allow')}} data-slbi-ui="analytics-allow" className="min-h-10 flex-1 rounded-lg bg-[#193e32] px-3 text-xs font-semibold text-white">Allow analytics &amp; area</button>
    </div>
  </aside>
}
