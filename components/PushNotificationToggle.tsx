'use client'
import {useEffect,useState} from 'react'
import {BellRing,BellOff,Smartphone} from 'lucide-react'
import {toast} from 'sonner'
import {useSession} from '@/app/components/SessionContext'
import {supportsPush,isIosDevice,isInstalled,readPushRegistration,enablePush,disablePush} from '@/lib/push/client'
export default function PushNotificationToggle(){
  const {user}=useSession();
  const [available,setAvailable]=useState(false)
  const [enabled,setEnabled]=useState(false)
  const [supported,setSupported]=useState(false)
  const [install,setInstall]=useState(false)
  const [busy,setBusy]=useState(false)
  useEffect(()=>{
    let alive=true;
    setSupported(supportsPush());setInstall(isIosDevice()&&!isInstalled());
    const sync=()=>setEnabled(supportsPush()&&Notification.permission==='granted'&&readPushRegistration()?.uid===user?.id&&!!user);
    sync();window.addEventListener('slbi-push-state',sync);
    void fetch('/api/push/config',{cache:'no-store'}).then(r=>r.json()).then(v=>{if(alive)setAvailable(v.enabled===true)}).catch(()=>{});
    return()=>{alive=false;window.removeEventListener('slbi-push-state',sync)}
  },[user?.id])
  async function toggle(){
    if(!user||busy)return;
    setBusy(true)
    try{
      if(enabled){await disablePush();setEnabled(false);toast.success('Device alerts disabled')}
      else{await enablePush(user.id);setEnabled(true);toast.success('Device alerts enabled')}
    }catch(e){toast.error(e instanceof Error?e.message:'Unable to update device alerts.')}
    finally{setBusy(false)}
  }
  return <div className="flex items-start gap-3 rounded-xl bg-[#F5F8F5] p-3">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#327254]">{install?<Smartphone size={18}/>:enabled?<BellRing size={18}/>:<BellOff size={18}/>}</span>
    <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#264738]">Device notifications</p><p className="mt-1 text-[11px] leading-4 text-stone-500">{install?'Add SLBI to your Home Screen to enable alerts.':!available?'Push service is not configured yet.':!supported?'This browser does not support push notifications.':enabled?'Receive updates even when this page is closed.':'Enable background and lock-screen alerts.'}</p></div>
    {!install&&available&&supported&&user&&<button type="button" role="switch" aria-label="Device notifications" aria-checked={enabled} disabled={busy} onClick={()=>void toggle()} className={'relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 '+(enabled?'bg-[#347A58]':'bg-stone-300')}><span className={'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all '+(enabled?'left-6':'left-1')}/></button>}
  </div>
}
