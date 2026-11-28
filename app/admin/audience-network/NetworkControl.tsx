'use client';
import {useEffect,useState} from 'react';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
type Network={enabled:boolean;optIns:number;deliveryEnabled:false};
export default function NetworkControl(){
 const [network,setNetwork]=useState<Network|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();void fetch('/api/admin/audience-network',{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setNetwork(d.network);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 const toggle=async()=>{
   if(!network||busy)return;
   setBusy(true);setError('');
   try{const r=await fetch('/api/admin/audience-network',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({enabled:!network.enabled})});const d=await r.json();if(!r.ok)throw Error(d.error);setNetwork(d.network);}
   catch(e){setError(e instanceof Error?e.message:'Unable to change settings.');}finally{setBusy(false);}
 };
 return <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6"><header><h1 className="text-2xl font-semibold">SLBI Audience Network</h1><p className="mt-1 text-sm text-neutral-500">Consent-based audience reach, independent of email delivery.</p></header>
   <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2"><IconsaxIcon name="people" variant="bulk" size={21}/><h2 className="text-sm font-semibold">Verified-account platform opt-ins</h2></div><p className="mt-3 text-3xl font-semibold">{network?.optIns??'—'}</p><p className="mt-1 text-xs text-neutral-500">No recipient identity export.</p></div>
   <div className="rounded-xl border border-neutral-200 bg-white p-4"><h2 className="text-sm font-semibold">Vendor planning access</h2><p className="mt-2 text-xs leading-5 text-neutral-600">Enabling this permits approved vendors with marketing access to view rounded reach estimates only for consented network members. Groups below 20 are withheld. This cannot enable delivery.</p><button type="button" aria-pressed={Boolean(network?.enabled)} disabled={!network||busy} onClick={()=>void toggle()} className="mt-3 rounded-md bg-[#EA580C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{network?.enabled?'Disable planning access':'Enable planning access'}</button><p className="mt-2 text-xs">Email delivery: disabled</p></div>
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </div>;
}
