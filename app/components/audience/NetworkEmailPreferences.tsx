'use client';
import {useEffect,useState} from 'react';
import {useSession} from '@/app/components/SessionContext';
type State={network:boolean;networkEligible?:boolean;language:'en'|'ta'|'si';businesses:{id:string;name:string;slug:string|null;following:boolean;email:boolean}[]};
export default function NetworkEmailPreferences(){
 const {user,loading}=useSession();
 const [state,setState]=useState<State|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [language,setLanguage]=useState<State['language']>('en');
 useEffect(()=>{
   setState(null);setError('');
   if(loading||!user)return;
   const c=new AbortController();
   void fetch('/api/audience',{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(!c.signal.aborted){setState(d.state);setLanguage(d.state.language)}}).catch(e=>{if(!c.signal.aborted)setError(e.message||'Preferences unavailable.')});
   return()=>c.abort();
 },[user?.id,loading]);
 const update=async(action:string,businessId?:string)=>{
   if(busy)return;setBusy(true);setError('');
   try{
     const r=await fetch('/api/audience',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,businessId,language,consentVersion:'slbi-audience-sharing-v2'})});
     const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to save.');
     if(businessId){setState(s=>s?{...s,businesses:s.businesses.filter(b=>b.id!==businessId)}:s)}else setState(d.state);
   }catch(e){setError(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}
 };
 return <section id="email-preferences" className="my-4 space-y-2 rounded-lg border border-neutral-200 p-3 text-sm">
   <h3 className="font-semibold">SLBI partner email preferences</h3>
   <p>Following a business shares your verified email with that business for marketing updates. Unfollow on its profile to stop future access. Copies already made cannot be recalled.</p>
   <p>Optional: separately allow SLBI to share your verified email with other approved businesses for marketing. This is not enabled by following a business.</p>
   {!user&&!loading&&<a className="underline" href="/login">Sign in to manage your email preferences</a>}
   {state&&<><label className="flex flex-wrap items-center gap-2">Preferred language <select className="rounded border px-2 py-1" value={language} disabled={busy} onChange={e=>setLanguage(e.target.value as State['language'])}><option value="en">English</option><option value="ta">Tamil</option><option value="si">Sinhala</option></select></label>
     <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy} onClick={()=>void update(state.network?'network_unsubscribe':'network_subscribe')} className="rounded-md border px-3 py-2 font-medium">{state.network?'Disable partner emails':'Allow partner emails'}</button>
     {state.network&&(state.networkEligible===false||state.language!==language)&&<button type="button" disabled={busy} onClick={()=>void update('network_subscribe')} className="underline">Confirm email preference</button>}</div>
     {state.businesses.filter(b=>b.email&&!b.following).map(b=><div key={b.id} className="flex flex-wrap items-center gap-2"><span>{b.name} — legacy email subscription</span><button type="button" disabled={busy} className="underline" onClick={()=>void update('unsubscribe',b.id)}>Unsubscribe</button></div>)}
   </>}
   {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
 </section>;
}
