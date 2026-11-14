'use client';
import {useState} from 'react';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

export type GoogleMailOwnedBusiness={id:string;name:string};
export type GoogleMailConnectionSummary={
  business_id:string;account_display_name:string|null;
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
  const [businessId,setBusinessId]=useState(businesses[0]?.id||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const connected=connections.filter(c=>c.status==='connected');
  const enabled=ready&&Boolean(businessId);
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
      {connected.map((c,i)=><p key={c.business_id+'-'+i}
        className="truncate text-[11px] text-[#426B50]" title="Preview connection metadata only">
        {c.account_display_name||'Verified mailbox'} · {businesses.find(b=>b.id===c.business_id)?.name||'Owned business'}
      </p>)}
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
    {error&&<p role="alert" className="rounded-lg border border-[#E8C8C8] bg-[#FFF4F4] p-3 text-[11px] leading-5 text-[#9C3B3B]">{error}</p>}
  </div>;
}
