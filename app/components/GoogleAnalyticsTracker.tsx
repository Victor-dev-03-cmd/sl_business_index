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
  // No unsolicited analytics consent banner. Third-party GA remains opt-in only.
  return null
}
