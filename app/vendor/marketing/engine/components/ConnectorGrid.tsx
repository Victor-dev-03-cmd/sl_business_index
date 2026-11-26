'use client';

import {useState,type ReactNode} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {ArrowRight,CheckCircle2,LockKeyhole,MailCheck,PhoneCall,PlugZap,X} from 'lucide-react';
import {MARKETING_CONNECTORS,type MarketingConnector} from '@/lib/marketing/engine-registry';
import WhatsAppConnectorSetup,{type ConnectorBusiness} from './WhatsAppConnectorSetup';

/** Locally bundled original brand pictograms, not generic shared plugin icons. */
const logos:Partial<Record<MarketingConnector['id'],string>>={
 whatsapp_business:'whatsapp',facebook_pages:'facebook',instagram:'instagram',
 messenger:'messenger',instagram_messages:'instagram',gmail:'gmail',
 outlook:'outlook',linkedin:'linkedin',youtube:'youtube',tiktok:'tiktok',
};
const labels:Record<MarketingConnector['group'],string>={
 social:'Social',messages:'Messaging',email:'Email',voice:'Calls',
};

function ProviderLogo({provider,size='card'}:{
 provider:MarketingConnector;size?:'card'|'dialog';
}){
 const slug=logos[provider.id];
 const large=size==='dialog';
 return <span className={'flex shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#EEEFF2] bg-white shadow-[0_5px_20px_rgba(18,18,22,.07)] '+
  (large?'h-[62px] w-[62px]':'h-[60px] w-[60px]')}>
  {slug?<img src={'/connector-icons/'+slug+'.svg'} alt="" aria-hidden="true"
    loading="lazy" width={large?50:46} height={large?50:46} className="h-[78%] w-[78%] object-contain"/>
    :provider.id==='verified_email'?<MailCheck size={large?32:29} strokeWidth={1.8} className="text-[#2872AE]"/>
      :<PhoneCall size={large?32:29} strokeWidth={1.8} className="text-[#FC7A16]"/>}
 </span>;
}

export default function ConnectorGrid({googleReady,googleConnected,gmailPreview,businesses,oauthNotice=null}:{
 googleReady:boolean;googleConnected:boolean;gmailPreview:ReactNode;
 oauthNotice?:'connected'|'cancelled'|'failed'|null;
 businesses:readonly ConnectorBusiness[];
}){
 // Google redirects to this page: reopen the Gmail dialog after callback.
 const [selected,setSelected]=useState<MarketingConnector['id']|null>(oauthNotice?'gmail':null);
 const current=MARKETING_CONNECTORS.find(item=>item.id===selected);
 return <section aria-label="Connect business apps" className="space-y-6">
  <header className="flex items-start gap-3">
   <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#CF6514]">
    <PlugZap size={22}/>
   </span>
   <div>
    <h2 className="text-xl font-extrabold tracking-tight text-[#222126]">Connect your business apps</h2>
    <p className="mt-1 text-xs leading-6 text-[#777580]">Choose an app, follow its setup instructions and connect through the official provider.</p>
   </div>
  </header>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Available connector apps">
   {MARKETING_CONNECTORS.map(item=>{
    const previewLinked=item.id==='gmail'&&googleConnected;
    return <button key={item.id} type="button" onClick={()=>setSelected(item.id)}
     aria-label={'Open '+item.name+' connection setup'}
     className="group flex min-h-[196px] min-w-0 flex-col items-start rounded-[19px] border border-[#E8E8EC] bg-white p-4 text-left shadow-[0_7px_20px_rgba(20,20,24,.045)] transition duration-200 hover:-translate-y-1 hover:border-[#FEB978] hover:shadow-[0_14px_32px_rgba(30,23,17,.11)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] motion-reduce:transform-none motion-reduce:transition-none">
     <ProviderLogo provider={item}/>
     <span className="mt-4 break-words text-[13px] font-extrabold leading-5 text-[#222126]">{item.name}</span>
     <span className="mt-1 text-[10px] font-medium text-[#95949A]">{labels[item.group]}</span>
     <span className="mt-auto flex w-full items-center justify-between gap-2 pt-4 text-[11px] font-bold text-[#B65E13]">
      {previewLinked?'Gmail connected':item.id==='gmail'&&googleReady?'Connect':'Set up'}<ArrowRight size={15} className="transition group-hover:translate-x-0.5"/>
     </span>
    </button>;
   })}
  </div>
  <Dialog.Root open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null)}}>
   <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[1000] bg-[#101013]/65 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out"/>
    {current&&<Dialog.Content
     className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[min(92dvh,900px)] w-[calc(100vw-24px)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[22px] border border-[#E9E9ED] bg-white shadow-[0_28px_85px_rgba(0,0,0,.28)] focus:outline-none sm:w-[calc(100vw-48px)]"
     aria-describedby="connector-dialog-description">
     <div className="flex shrink-0 items-start gap-4 border-b border-[#F0EFF1] bg-[#FEFEFF] p-5 sm:p-7">
      <ProviderLogo provider={current} size="dialog"/>
      <div className="min-w-0 flex-1">
       <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#B35E19]">Plugin & App Connectors</p>
       <Dialog.Title className="mt-1 text-xl font-extrabold tracking-tight text-[#232329] sm:text-2xl">
        {current.name}
       </Dialog.Title>
       <Dialog.Description id="connector-dialog-description" className="mt-1 text-xs leading-5 text-[#797781]">
        {current.id==='whatsapp_business'?'Connect your business WhatsApp through Meta':
         'Connect your official business account'}
       </Dialog.Description>
      </div>
      <Dialog.Close aria-label="Close connection popup"
       className="rounded-xl border border-[#E8E8EB] bg-white p-2 text-[#616067] transition hover:bg-[#FFF3E9] hover:text-[#BA6219]">
       <X size={19}/>
      </Dialog.Close>
     </div>
     <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
      {current.id==='whatsapp_business'
       ?<WhatsAppConnectorSetup key="whatsapp-setup" businesses={businesses}/>
       :<div className="space-y-5">
        <div className="rounded-xl border border-[#EEE9E4] bg-[#FFFAF5] p-4">
         <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#2B2725]">
          <CheckCircle2 size={17} className="text-[#BA631B]"/>What you need
         </h3>
         <p className="mt-2 text-xs leading-6 text-[#6E6863]">{current.requirements}</p>
        </div>
        <div className="rounded-xl border border-[#E7E8EC] bg-white p-4">
         <h3 className="text-sm font-extrabold text-[#29282C]">How to connect</h3>
         <p className="mt-2 text-xs leading-6 text-[#76737B]">
          Sign in with your official provider account, choose the business asset you manage, and approve only the requested permissions. SLBI will show a verified connection status after provider authorization is complete.
         </p>
         <p className="mt-3 text-[11px] font-medium text-[#8A6A56]">
          {current.id==='gmail'?'Gmail uses the official Google authorization screen. It can connect when verified Google Cloud settings are completed. Optional inbox reading needs an additional restricted Google permission; sending campaigns and AI training are not automatically enabled.':
           'This provider still requires its official integration and permissions.'}
         </p>
        </div>
        {current.id==='gmail'?<div>{gmailPreview}</div>:
         <button type="button" disabled aria-disabled="true"
          className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#E6E6E9] bg-[#F4F4F6] px-4 text-xs font-bold text-[#87858E]">
          <LockKeyhole size={17}/>Connect · approval required
         </button>}
        <p className="text-center text-[11px] text-[#949198]">{current.id==='gmail'&&googleConnected?'The connected Gmail account appears above. No message is sent by opening this setup.':'No account is connected by opening this setup. No marketing message is sent.'}</p>
       </div>}
     </div>
    </Dialog.Content>}
   </Dialog.Portal>
  </Dialog.Root>
  <p className="text-[11px] leading-6 text-[#828089]">
   Official provider approval and business ownership verification are required. Connecting an account never authorizes automatic marketing messages.
  </p>
 </section>;
}
