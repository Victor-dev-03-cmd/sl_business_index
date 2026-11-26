'use client';

import {useState} from 'react';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

export type GmailMailboxPreviewConnection={
  id:string;business_id:string;account_display_name:string|null;
  status:string;granted_scopes:string[];
};
type PreviewMessage={
  id:string;from:string;subject:string;date:string;
  triage:{kind:string;label:string;nextStep:string;requiresHumanReview:true;outboundAuthorized:false};
};
const READ_SCOPE='https://www.googleapis.com/auth/gmail.readonly';

/**
 * Owner-initiated, ephemeral Gmail header preview. No browser storage, mailbox
 * sync, automatic AI model call, marketing audience creation, or send action.
 */
export default function GoogleMailInboxPreview({connections,readEnabled}:{
  connections:readonly GmailMailboxPreviewConnection[];
  readEnabled:boolean;
}){
  const capable=connections.filter(c=>c.status==='connected'&&c.granted_scopes.includes(READ_SCOPE));
  const [id,setId]=useState('');
  const [messages,setMessages]=useState<PreviewMessage[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  const selected=capable.find(c=>c.id===id)||capable[0]||null;
  const preview=async()=>{
    if(!selected||loading||!readEnabled)return;
    setLoading(true);setError('');setMessages([]);setLoaded(false);
    try{
      const response=await fetch('/api/marketing/oauth/google_mail/preview',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({connectionId:selected.id,businessId:selected.business_id}),
      });
      const data:unknown=await response.json();
      const body=data&&typeof data==='object'&&!Array.isArray(data)
        ?data as Record<string,unknown>:{};
      if(!response.ok||body.preview!==true||!Array.isArray(body.messages))
        throw new Error(typeof body.error==='string'?body.error:'Preview unavailable.');
      const safe:PreviewMessage[]=[];
      for(const m of body.messages.slice(0,5)){
        if(!m||typeof m!=='object')continue;
        const item=m as Partial<PreviewMessage>;
        if(typeof item.id!=='string'||typeof item.subject!=='string'||
           typeof item.from!=='string'||typeof item.date!=='string'||!item.triage||
           typeof item.triage.nextStep!=='string'||typeof item.triage.label!=='string')continue;
        safe.push({id:item.id.slice(0,128),subject:item.subject.slice(0,180),
          from:item.from.slice(0,220),date:item.date.slice(0,220),
          triage:item.triage as PreviewMessage['triage']});
      }
      setMessages(safe);setLoaded(true);
    }catch(caught){setError(caught instanceof Error?caught.message:'Mailbox preview failed.');}
    finally{setLoading(false);}
  };
  return <section data-testid="gmail-inbox-preview" className="space-y-3 rounded-[17px] border border-[#EFE4DC] bg-[#FFFCF9] p-4">
    <div className="flex items-start gap-2">
      <span className="rounded-lg bg-[#FFF0E4] p-2 text-[#B96921]"><IconsaxIcon name="sms" size={18}/></span>
      <div className="min-w-0"><h3 className="text-[12px] font-bold text-[#302A2B]">Growth AI · Mail intelligence preview</h3>
        <p className="mt-1 text-[10px] leading-5 text-[#80757B]">Only when you request it: up to 5 Inbox message headers, with local rule-based triage. No full message bodies, attachments, AI provider upload or sending.</p></div>
    </div>
    {readEnabled&&capable.length>0?<>
      {capable.length>1&&<label className="block text-[11px] font-semibold text-[#5F5559]">Connected mailbox
        <select value={selected?.id||''} onChange={e=>{setId(e.target.value);setMessages([]);setLoaded(false);}}
          className="mt-1 h-11 w-full rounded-xl border border-[#E6DFDD] bg-white px-3 text-[11px] text-[#242126]">
          {capable.map(c=><option key={c.id} value={c.id}>{c.account_display_name||'Verified Gmail account'}</option>)}
        </select></label>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>void preview()} disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#202024] px-4 text-[11px] font-semibold text-white disabled:opacity-50">
          <IconsaxIcon name="eye" size={17} color="white"/>{loading?'Reading headers…':'Preview last 5 inbox subjects'}
        </button>
        {loaded&&<button type="button" onClick={()=>{setMessages([]);setLoaded(false);setError('');}}
          className="min-h-11 rounded-xl border border-[#EAE1DE] px-4 text-[11px] font-semibold text-[#82757C]">Clear preview</button>}
      </div>
      {loaded&&messages.length===0&&<p role="status" className="text-[11px] text-[#7B747B]">No Inbox messages were returned.</p>}
      {messages.length>0&&<div className="space-y-2">{messages.map(m=><article key={m.id}
        className="rounded-xl border border-[#EBE4E1] bg-white p-3 text-[11px]">
        <h4 className="break-words font-bold text-[#242126]">{m.subject}</h4>
        <p className="mt-1 break-words text-[#8A8286]">{m.from}</p>
        <p className="mt-2 font-semibold text-[#A95412]">{m.triage.label}</p>
        <p className="mt-1 leading-5 text-[#5E5A60]">{m.triage.nextStep}</p>
        <p className="mt-2 text-[10px] text-[#989095]">Review required · no reply sent</p>
      </article>)}</div>}
    </>:<p className="rounded-xl bg-[#F7F1EC] p-3 text-[11px] leading-6 text-[#81727A]">
      {!readEnabled?'Read access is disabled until the restricted-scope preview flag and Google app review are ready.':
        'No connected Gmail mailbox with explicit read permission. Reconnect using the reviewed inbox-read consent first.'}
    </p>}
    {error&&<p role="alert" className="rounded-xl bg-[#FFF0F0] p-3 text-[11px] text-[#9D3D3D]">{error}</p>}
    <p className="text-[10px] leading-5 text-[#8F8188]">Mailbox read access never grants permission to email contacts for marketing. A separate verified opt-in, unsubscribe and sender review are required.</p>
  </section>;
}
