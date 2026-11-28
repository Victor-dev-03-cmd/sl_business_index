'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import BusinessAudienceControls,{type BusinessAudienceState} from '@/app/components/audience/BusinessAudienceControls';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
type Entry=BusinessAudienceState&{id:string;name:string;slug:string|null};
type State={businesses:Entry[];network:boolean;language:'en'|'ta'|'si'};
export default function FollowingPage(){
 const [state,setState]=useState<State|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [language,setLanguage]=useState<'en'|'ta'|'si'>('en');
 const load=useCallback(async()=>{
   try{const r=await fetch('/api/audience',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load preferences.');setState(d.state);setLanguage(d.state.language);setError('');}
   catch(e){setError(e instanceof Error?e.message:'Unable to load preferences.');}
 },[]);
 useEffect(()=>{void load();},[load]);
 const network=async(enable:boolean)=>{
   setBusy(true);setError('');
   try{const r=await fetch('/api/audience',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:enable?'network_subscribe':'network_unsubscribe',language})});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not save.');setState(d.state);}
   catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
 };
 return <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-8 font-[family-name:var(--font-inter)]">
   <header className="mb-5"><p className="flex items-center gap-2 text-xs font-medium text-[#C2410C]"><IconsaxIcon name="people" variant="bulk"/> My audience preferences</p><h1 className="mt-2 text-2xl font-semibold">Following &amp; subscriptions</h1><p className="mt-1 text-sm text-neutral-500">Choose the businesses and marketing updates you receive.</p></header>
   {error&&<div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <Link href="/login" className="underline">Sign in</Link></div>}
   {!state&&!error&&<p role="status" className="text-sm">Loading preferences…</p>}
   {state&&<><section className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 text-neutral-900">
     <h2 className="text-base font-semibold">SLBI Audience Network</h2><p className="mt-2 text-xs leading-5 text-neutral-600">Opt in separately to offers from participating businesses through SLBI. Your account email is not shared with vendors. You can withdraw at any time. Delivery is not active.</p>
     <label className="mt-3 flex items-center gap-3 text-sm">Preferred language <select value={language} disabled={busy} onChange={e=>setLanguage(e.target.value as State['language'])} className="rounded-md border border-neutral-200 px-2 py-1 text-sm"><option value="en">English</option><option value="ta">Tamil</option><option value="si">Sinhala</option></select></label>
     <label className="mt-3 flex items-center justify-between gap-3 text-sm"><span>Receive SLBI partner marketing emails</span><input type="checkbox" checked={state.network} disabled={busy} onChange={e=>void network(e.target.checked)} className="accent-[#F97316]"/></label>
     {state.network&&state.language!==language&&<button type="button" disabled={busy} onClick={()=>void network(true)} className="mt-2 rounded-md border px-3 py-1 text-xs font-medium">Save language</button>}
   </section>
   <section className="space-y-3"><h2 className="text-base font-semibold">Your businesses</h2>
     {state.businesses.length===0&&<p className="rounded-lg border p-4 text-sm">No followed businesses or subscriptions. <Link href="/nearby" className="text-[#C2410C] underline">Discover businesses</Link></p>}
     {state.businesses.map(b=><article key={b.id} className="space-y-2"><Link href={'/business/'+encodeURIComponent(b.slug||b.id)} className="text-sm font-semibold">{b.name}</Link><BusinessAudienceControls businessId={b.id} businessName={b.name} initial={b} onChanged={()=>void load()}/></article>)}
   </section></>}
 </main>;
}
