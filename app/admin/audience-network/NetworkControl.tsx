'use client';
import {useEffect,useState} from 'react';
type RequestItem={id:string;business_name:string;requested_count:number;language:string;purpose:string;status:string;expires_at:string|null};
type Network={requests:RequestItem[];deliveryEnabled:false};
export default function NetworkControl(){
 const [network,setNetwork]=useState<Network|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();void fetch('/api/admin/audience-network',{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setNetwork(d.network);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 const review=async(requestId:string,decision:string)=>{
   if(busy)return;setBusy(true);setError('');
   try{const r=await fetch('/api/admin/audience-network',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({requestId,decision})});const d=await r.json();if(!r.ok)throw Error(d.error);setNetwork(d.network);}
   catch(e){setError(e instanceof Error?e.message:'Review failed.');}finally{setBusy(false);}
 };
 return <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6"><header><h1 className="text-2xl font-semibold">Audience requests</h1><p className="mt-1 text-sm text-neutral-500">Direct subscriptions need no approval. Review only requests for additional SLBI audiences.</p></header>
 {network?.requests.length===0&&<p className="rounded-lg border bg-white p-4 text-sm">No requests yet.</p>}
 {network?.requests.map(q=><article key={q.id} className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 text-neutral-900">
 <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{q.business_name}</h2><span className="text-xs capitalize">{q.status}</span></div>
 <p className="text-xs">{q.requested_count} requested · {q.language}</p><p className="break-words text-sm">{q.purpose}</p>
 {q.status==='pending'&&<div className="flex gap-2"><button disabled={busy} onClick={()=>void review(q.id,'approved')} className="rounded-md bg-[#EA580C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Approve</button><button disabled={busy} onClick={()=>void review(q.id,'rejected')} className="rounded-md border px-3 py-2 text-xs font-semibold">Reject</button></div>}
 {q.status==='approved'&&<button disabled={busy} onClick={()=>void review(q.id,'revoked')} className="rounded-md border px-3 py-2 text-xs">Revoke access</button>}
 </article>)}
 <p className="text-xs text-neutral-500">Approval grants up to the requested number of consenting recipients for seven days. No email delivery is enabled.</p>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </div>;
}
