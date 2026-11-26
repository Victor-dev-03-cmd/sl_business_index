'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import GoogleMailInboxPreview from './GoogleMailInboxPreview';

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
  ready,businesses,connections,readEnabled=false,
  deployment='unavailable',oauthNotice=null,
}:{
  ready:boolean;readEnabled?:boolean;
  deployment?:'production'|'preview'|'unavailable';
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
  const connected=connections.filter(c=>c.status==='connected');
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
    {connected.length>0&&<Link href="/vendor/marketing-engine/email"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 text-[11px] font-semibold text-white hover:bg-[#E86D00]">
      <IconsaxIcon name="sms" size={18} color="white"/> Continue to Email Marketing
    </Link>}
    {oauthNotice==='connected'&&connected.length>0&&
      <p role="status" className="rounded-xl border border-[#F2CDAE] bg-[#FFF3E8] p-3 text-[11px] font-semibold text-[#8A450E]">
        Gmail connected and verified. You can now use the permitted tools below.
      </p>}
    {oauthNotice==='connected'&&connected.length===0&&
      <p role="alert" className="rounded-xl border border-[#F2CDAE] bg-[#FFF5ED] p-3 text-[11px] text-[#925319]">
        Google sign-in returned, but no authorized mailbox is visible. Check ownership or reconnect.
      </p>}
    {oauthNotice==='cancelled'&&
      <p role="status" className="rounded-xl border border-[#E7DFDA] bg-[#FAF7F5] p-3 text-[11px] text-[#756E72]">Google authorization was cancelled. Nothing was connected.</p>}
    {ready&&<GoogleMailInboxPreview connections={connected} readEnabled={readEnabled}/>}

    {connected.length>0&&<div className="space-y-2 rounded-xl border border-[#F1DAC5] bg-[#FFFAF6] p-3">
      <p className="text-[11px] font-bold text-[#9E520D]">
        {connected.length} authorized {connected.length===1?'Gmail account':'Gmail accounts'} connected
      </p>
      {connected.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] text-[#625A59]"
          title="Owner-visible connection metadata only">
          {c.account_display_name||'Verified mailbox'} · {businesses.find(b=>b.id===c.business_id)?.name||'Owned business'}
        </p>
        <button type="button" onClick={()=>void disconnect(c.id,c.business_id)}
          disabled={busy||disconnectingId!==null} aria-busy={disconnectingId===c.id}
          className="shrink-0 rounded-lg border border-[#E6C4A4] bg-white px-3 py-2 text-[11px] font-bold text-[#A25416] hover:bg-[#FFF1E3] disabled:cursor-not-allowed disabled:opacity-50">
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
        ready?'Connect Gmail securely':'Gmail · Google setup required'}
    </button>
    {ready&&<p className="text-[10px] leading-5 text-[#827680]">
      {deployment==='production'?'Production Google OAuth is configured. ':'Preview-only Google OAuth is configured. '}
      Google identity + Gmail send are requested; {readEnabled?'read-only inbox access is also requested by Google consent':'AI inbox reading is separately disabled'}. Connecting never permits automatic email marketing or model training.
    </p>}
    {!ready&&<div role="status" className="rounded-xl border border-[#F2DEC9] bg-[#FFFAF5] p-3 text-[11px] leading-5 text-[#80583C]">
      <p className="font-bold">Google OAuth setup required</p>
      <p className="mt-1">{deployment==='production'
        ?'The SLBI administrator must finish Google Cloud OAuth and the protected Vercel Production settings. Gmail Connect unlocks automatically after secure configuration.'
        :'A reviewed Google OAuth Preview app and the protected Preview settings are needed.'}</p>
      <p className="mt-2">No password is requested or stored by SLBI. Previously connected owners can still disconnect below.</p>
    </div>}
    {disconnectedNotice&&<p role="status" className="rounded-lg border border-[#CAE7D5] bg-[#F5FBF7] p-3 text-[11px] leading-5 text-[#2F7652]">{disconnectedNotice}</p>}
    {error&&<p role="alert" className="rounded-lg border border-[#E8C8C8] bg-[#FFF4F4] p-3 text-[11px] leading-5 text-[#9C3B3B]">{error}</p>}
  </div>;
}
