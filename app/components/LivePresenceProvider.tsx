'use client'
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {usePathname} from 'next/navigation'
import {supabase} from '@/lib/supabaseClient'

const LiveContext = createContext<number|null>(null)
export const useLiveCount = () => useContext(LiveContext)
function isPublic(path: string) {
  return !/^\/(?:admin|vendor|auth|login|signup|register|reset-password|account|profile|settings)(?:\/|$|-)/.test(path)
}
export function LivePresenceProvider({children}:{children:ReactNode}) {
  const path = usePathname() || '/'
  const enabled = isPublic(path)
  const [count,setCount] = useState<number|null>(null)
  useEffect(()=>{
    // Anonymous per-connection key; never send auth ID, IP, location or page.
    const nav = navigator as Navigator & {globalPrivacyControl?:boolean}
    if (!enabled || nav.doNotTrack === '1' || nav.globalPrivacyControl) {setCount(null);return}
    let connected=false, alive=true
    const channel = supabase.channel('slbi-online-v2',{config:{presence:{key:crypto.randomUUID()}}})
    const visibility = () => {
      if (!connected || !alive) return
      if(document.visibilityState==='visible') void channel.track({active:true})
      else void channel.untrack()
    }
    channel.on('presence',{event:'sync'},()=>{
      if(alive) setCount(Object.values(channel.presenceState()).filter(v=>v.length>0).length)
    }).subscribe(status=>{
      if(!alive)return
      connected = status==='SUBSCRIBED'
      if(connected) visibility()
      else setCount(null)
    })
    document.addEventListener('visibilitychange',visibility)
    return ()=>{
      alive=false;connected=false
      document.removeEventListener('visibilitychange',visibility)
      void supabase.removeChannel(channel)
    }
  },[enabled])
  return <LiveContext.Provider value={enabled ? count : null}>{children}</LiveContext.Provider>
}
