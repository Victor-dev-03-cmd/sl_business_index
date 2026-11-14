'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

export type GoogleMailOwnedBusiness={id:string;name:string};
export type GoogleMailConnectionSummary={
  id:string;business_id:string;account_display_name:string|null;
  status:string;connected_at:string|null;
};

/**
 * Browser never sees Google client credentials, access/refresh tokens, PKCE
 * or service-role keys. Start state is persisted by the server and one-time.
 */
export default function GoogleMailPreviewConnect({
  ready,businesses,connections,
}:{
  ready:boolean;businesses:readonly GoogleMailOwnedBusiness[];
  connections:readonly GoogleMailConnectionSummary[];
}){
  const router=useRouter();
  const [businessId,setBusinessId]=useState(businesses[0]?.id||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [disconnectedNotice,setDisconnectedNotice]=useState('');
  const [disconnectingId,setDisconnectingId]=useState<string|null>(null);
  const connected=connections.filter(c=>c.status==='connected');
  const enabled=ready&&Boolean(businessId);
  const disconnect=async(connectionId:string,ownedBusinessId:string)=>{
    if(!ready||disconnectingId||busy)return;
    if(!window.confirm('Disconnect this mailbox from SLBI and permanently delete its stored credentials? Google account permissions must be revoked separately.'))return;
    setError('');setDisconnectedNotice('');setDisconnectingId(connectionId);
    try{
      const response=await fetch('/api/marketing/oauth/google_mail/disconnect',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({businessId:ownedBusinessId,connectionId}),
      });
      const body:unknown=await response.json();
      const reply=body&&typeof body==='object'&&!Array.isArray(body)
        ?body as Record<string,unknown>:{};
      if(!response.ok||reply.disconnected!==true)
        throw new Error(typeof reply.error==='string'?reply.error:'Could not disconnect the mailbox.');
      setDisconnectedNotice('SLBI stored credentials removed. Revoke SLBI access separately in your Google Account security settings.');
      router.refresh(); // Reload only owner-scoped connection metadata.
    }catch(reason){
      setError(reason instanceof Error?reason.message:'Connection removal failed.');
    }finally{setDisconnectingId(null);}
  };
  const connect=async()=>{
    if(!enabled||busy)return;
    setError('');setBusy(true);
    try{
      const response=await fetch('/api/marketing/oauth/google_mail/start',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({businessId}),
        cache:'no-store',
      });
      const body:unknown=await response.json();
      const reply=body&&typeof body==='object'&&!Array.isArray(body)
        ?body as Record<string,unknown>:{};
      if(!response.ok)throw new Error(typeof reply.error==='string'?
        reply.error:'Google Mail authorization is not ready.');
      if(typeof reply.authorizationUrl!=='string')
        throw new Error('Authorization response is incomplete.');
      const next=new URL(reply.authorizationUrl);
      // Never follow a server response to an arbitrary website.
      if(next.origin!=='https://accounts.google.com'
        ||next.pathname!=='/o/oauth2/v2/auth')
        throw new Error('Unexpected authorization destination.');
      window.location.assign(next.href);
    }catch(reason){
      setError(reason instanceof Error?reason.message:'Could not start Google authorization.');
      setBusy(false);
    }
  };
  return <div className="mt-auto space-y-3 pt-4">
    {connected.length>0&&<div className="space-y-2 rounded-lg border border-[#D8EBDD] bg-[#F3FAF5] p-3">
      <p className="text-[11px] font-bold text-[#27734A]">
        {connected.length} verified preview {connected.length===1?'mailbox':'mailboxes'} connected
      </p>
      {connected.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] text-[#426B50]"
          title="Preview connection metadata only">
          {c.account_display_name||'Verified mailbox'} · {businesses.find(b=>b.id===c.business_id)?.name||'Owned business'}
        </p>
        <button type="button" onClick={()=>void disconnect(c.id,c.business_id)}
          disabled={!ready||busy||disconnectingId!==null} aria-busy={disconnectingId===c.id}
          className="shrink-0 rounded-lg border border-[#9ECDB0] bg-white px-3 py-2 text-[11px] font-bold text-[#276B45] hover:bg-[#E5F6EB] disabled:cursor-not-allowed disabled:opacity-50">
          {disconnectingId===c.id?'Removing stored credentials…':'Disconnect from SLBI'}
        </button>
      </div>)}
    </div>}
    {enabled&&businesses.length>1&&<div>
      <label htmlFor="marketing-google-preview-business" className="mb-1.5 block text-[11px] font-bold text-[#686872]">
        Business to connect
      </label>
      <select id="marketing-google-preview-business" value={businessId}
        onChange={event=>setBusinessId(event.target.value)}
        className="w-full rounded-lg border border-[#DFDFE4] bg-white px-3 py-2.5 text-xs text-[#202024]">
        {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>}
    <button type="button" disabled={!enabled||busy} aria-busy={busy}
      onClick={()=>void connect()}
      className={'flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[11px] font-extrabold transition '+
      (enabled&&!busy?'bg-[#242428] text-white hover:bg-[#3A373C]':'cursor-not-allowed border border-[#E5E5E8] bg-[#F5F5F6] text-[#96969D]')}>
      <IconsaxIcon name={enabled?'sms':'shield-tick'} size={17}/>
      {busy?'Preparing secure Google authorization…':
        ready?'Connect Google Mail · Preview only':'Google Mail · Preview setup required'}
    </button>
    {!ready&&<p className="text-[10px] leading-5 text-[#92919A]">
      Requires a verified Pro test vendor, an approved Google OAuth app and the isolated preview database. Production connection stays disabled.
    </p>}
    {disconnectedNotice&&<p role="status" className="rounded-lg border border-[#CAE7D5] bg-[#F5FBF7] p-3 text-[11px] leading-5 text-[#2F7652]">{disconnectedNotice}</p>}
    {error&&<p role="alert" className="rounded-lg border border-[#E8C8C8] bg-[#FFF4F4] p-3 text-[11px] leading-5 text-[#9C3B3B]">{error}</p>}
  </div>;
}
