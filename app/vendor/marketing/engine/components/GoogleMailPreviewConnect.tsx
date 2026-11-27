'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

export type GoogleMailOwnedBusiness={id:string;name:string};
export type GoogleMailConnectionSummary={
  id:string;business_id:string;account_display_name:string|null;
  status:string;connected_at:string|null;granted_scopes:string[];
};

/**
 * Browser never sees Google client credentials, access/refresh tokens, PKCE
 * or service-role keys. Start state is persisted by the server and one-time.
 */
export default function GoogleMailPreviewConnect({
  ready,businesses,connections,oauthNotice=null,
}:{
  ready:boolean;
  oauthNotice?:'connected'|'cancelled'|'failed'|null;
  businesses:readonly GoogleMailOwnedBusiness[];
  connections:readonly GoogleMailConnectionSummary[];
}){
  const router=useRouter();
  const [businessId,setBusinessId]=useState(businesses[0]?.id||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [disconnectedNotice,setDisconnectedNotice]=useState('');
  const [disconnectingId,setDisconnectingId]=useState<string|null>(null);
  const [removedIds,setRemovedIds]=useState<string[]>([]);
  // Only RLS-authorized server records may show a connected status. Avoid
  // a duplicate Connect CTA while at least one Gmail mailbox is linked.
  const connected=connections.filter(c=>c.status==='connected'&&!removedIds.includes(c.id));
  const enabled=ready&&Boolean(businessId);
  const disconnect=async(connectionId:string,ownedBusinessId:string)=>{
    if(disconnectingId||busy)return;
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
      setRemovedIds(previous=>[...previous,connectionId]);
      setDisconnectedNotice('Disconnected from SLBI. Revoke permission separately in Google Account security settings.');
      router.refresh(); // Reload only owner-scoped connection metadata.
    }catch(reason){
      setError(reason instanceof Error?reason.message:'Connection removal failed.');
    }finally{setDisconnectingId(null);}
  };
  const connect=async()=>{
    if(!enabled||busy||connected.length>0)return;
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
  return <div data-testid="gmail-connector-compact" className="space-y-3">
    {connected.length>0?(
      <div className="space-y-2" aria-label="Connected Gmail accounts">
        {connected.map(c=>(
          <div key={c.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E9E4E2] bg-[#FBFAF9] px-3.5 py-3 sm:flex-nowrap">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#20A269]"/>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[#25764D]">Connected</p>
                <p className="truncate text-[12px] font-semibold text-[#29272B]"
                   title={c.account_display_name||'Gmail account'}>
                  {c.account_display_name||'Gmail account'}
                </p>
              </div>
            </div>
            <button type="button" onClick={()=>void disconnect(c.id,c.business_id)}
              disabled={busy||disconnectingId!==null} aria-busy={disconnectingId===c.id}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#E9C5AE] bg-white px-3 text-[11px] font-bold text-[#AB591D] transition hover:bg-[#FFF3EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] disabled:opacity-50">
              {disconnectingId===c.id?'Disconnecting…':'Disconnect'}
            </button>
          </div>
        ))}
      </div>
    ):(
      <>
        {businesses.length>1&&<label htmlFor="marketing-google-preview-business"
          className="block text-[11px] font-semibold text-[#69636A]">
          Business
          <select id="marketing-google-preview-business" value={businessId}
            onChange={event=>setBusinessId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-[#E7E3E5] bg-white px-3 text-xs text-[#242126]">
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>}
        <button type="button" disabled={!enabled||busy} aria-busy={busy}
          onClick={()=>void connect()}
          className={'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] '+
            (enabled&&!busy?'bg-[#FF7900] text-white hover:bg-[#E86D00]':'cursor-not-allowed bg-[#F1EFF0] text-[#99949A]')}>
          <IconsaxIcon name="sms" size={18} color={enabled&&!busy?'white':'#99949A'}/>
          {busy?'Connecting…':ready?'Connect Gmail':'Google setup required'}
        </button>
        {!ready&&<p role="status" className="text-center text-[11px] text-[#89838A]">
          Gmail connection is not configured yet.
        </p>}
        {oauthNotice==='connected'&&<p role="alert" className="text-[11px] text-[#995A25]">
          Google returned, but no connected account was found.
        </p>}
        {oauthNotice==='cancelled'&&<p role="status" className="text-[11px] text-[#777078]">
          Google sign-in was cancelled.
        </p>}
        {oauthNotice==='failed'&&<p role="alert" className="text-[11px] text-[#9A4747]">
          Gmail authorization could not be completed.
        </p>}
      </>
    )}
    {disconnectedNotice&&<p role="status" className="text-[11px] leading-5 text-[#757078]">{disconnectedNotice}</p>}
    {error&&<p role="alert" className="rounded-lg bg-[#FFF3F1] p-2.5 text-[11px] text-[#9D3D3D]">{error}</p>}
  </div>;
}
