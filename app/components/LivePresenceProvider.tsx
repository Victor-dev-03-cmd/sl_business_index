'use client'
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {usePathname} from 'next/navigation'
import {supabase} from '@/lib/supabaseClient'
import {analyticsConsentKey,analyticsConsentEvent,coarseLocation,summarizePresence,emptyActivity,type LiveActivity,type CoarseLocation} from '@/lib/live/presence-geo'

const LiveContext=createContext<LiveActivity>(emptyActivity)
export const useLiveCount=()=>useContext(LiveContext).count
export const useLiveActivity=()=>useContext(LiveContext)
function isPublic(path:string){
  return !/^\/(?:admin|vendor|auth|login|signup|register|reset-password|account|profile|settings)(?:\/|$|-)/.test(path)
}
export function LivePresenceProvider({children}:{children:ReactNode}){
  const path=usePathname()||'/'
  const enabled=isPublic(path)
  const observe=enabled||/^\/admin(?:\/|$)/.test(path)
  const [activity,setActivity]=useState<LiveActivity>(emptyActivity)
  useEffect(()=>{
    const nav=navigator as Navigator & {globalPrivacyControl?:boolean}
    if(!observe||nav.doNotTrack==='1'||nav.globalPrivacyControl){setActivity(emptyActivity);return}
    let connected=false,alive=true
    let geo:CoarseLocation|null=null,attempted=false,version=0
    const controller=new AbortController()
    // First-party ephemeral aggregate presence does not use GA or GPS. Preserve explicit prior area denial.
    const areaAllowed=()=>{try{return localStorage.getItem(analyticsConsentKey)!=='deny'}catch{return false}}
    const channel=supabase.channel('slbi-online-v2',{config:{presence:{key:crypto.randomUUID()}}})
    const active=()=>alive&&connected&&enabled&&document.visibilityState==='visible'
    let lastPayload=''
    const publish=()=>{
      if(!connected||!alive)return
      if(!active()){
        if(lastPayload!==''){lastPayload='';void channel.untrack()}
        return
      }
      const payload={active:true,...(areaAllowed()&&geo?geo:{})}
      const serialized=JSON.stringify(payload)
      if(serialized===lastPayload)return
      lastPayload=serialized
      void channel.track(payload).then(status=>{if(status!=='ok'&&lastPayload===serialized)lastPayload=''})
    }
    const refresh=()=>{
      if(!areaAllowed()){version++;geo=null;attempted=false}
      publish()
      if(!active()||!areaAllowed()||attempted)return
      attempted=true
      const current=++version
      void fetch('/api/live-area',{cache:'no-store',signal:controller.signal})
        .then(r=>r.ok?r.json():null).then(body=>{
          if(!alive||version!==current||!areaAllowed())return
          geo=coarseLocation(body?.location?.country,body?.location?.province)
          publish()
        }).catch(()=>{/* Count remains available with unknown area. */})
    }
    channel.on('presence',{event:'sync'},()=>{
      if(alive)setActivity(summarizePresence(channel.presenceState()))
    }).subscribe(status=>{
      if(!alive)return
      connected=status==='SUBSCRIBED'
      lastPayload=''
      if(connected)refresh()
      else setActivity(emptyActivity)
    })
    document.addEventListener('visibilitychange',refresh)
    window.addEventListener(analyticsConsentEvent,refresh)
    window.addEventListener('storage',refresh)
    return()=>{
      alive=false;connected=false;controller.abort()
      document.removeEventListener('visibilitychange',refresh)
      window.removeEventListener(analyticsConsentEvent,refresh)
      window.removeEventListener('storage',refresh)
      void supabase.removeChannel(channel)
    }
  },[enabled,observe])
  return <LiveContext.Provider value={observe?activity:emptyActivity}>{children}</LiveContext.Provider>
}
