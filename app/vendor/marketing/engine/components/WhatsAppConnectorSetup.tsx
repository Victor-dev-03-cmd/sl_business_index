'use client';

import {useEffect,useState} from 'react';
import {CheckCircle2,Loader2,LockKeyhole,MessageSquareText,Phone,QrCode,ShieldAlert} from 'lucide-react';

export type ConnectorBusiness={id:string;name:string;status:string};
type Method='phone'|'qr';
type Readiness={
 ok:true;
 business:{id:string;name:string;approved:boolean};
 vendorOnboardingAvailable:boolean;
 vendorOnboardingBlocker:string;
 connections:Array<{id:string;status:string;displayName:string|null;connectedAt:string|null}>;
 marketingSendsAvailable:boolean;
};
const E164=/^\+[1-9][0-9]{7,14}$/;

export default function WhatsAppConnectorSetup({businesses}:{businesses:readonly ConnectorBusiness[]}){
 const [businessId,setBusinessId]=useState(businesses.find(b=>b.status==='approved')?.id??businesses[0]?.id??'');
 const [method,setMethod]=useState<Method>('phone');
 const [phone,setPhone]=useState('');
 const [ownerConfirmed,setOwnerConfirmed]=useState(false);
 const [loading,setLoading]=useState(false);
 const [submitting,setSubmitting]=useState(false);
 const [readiness,setReadiness]=useState<Readiness|null>(null);
 const [notice,setNotice]=useState('');
 const [recipient,setRecipient]=useState('');
 const [testConsent,setTestConsent]=useState(false);
 const [testSending,setTestSending]=useState(false);
 const [testNotice,setTestNotice]=useState('');
 const [error,setError]=useState('');
 const selectedBusiness=businesses.find(b=>b.id===businessId);
 const eligible=selectedBusiness?.status==='approved';
 // A metadata row is NOT enough. A vendor must be verified by the official
 // provider onboarding path and independently cleared for sending.
 const verified=Boolean(readiness?.vendorOnboardingAvailable
  &&readiness.connections.some(c=>c.status==='connected')
  &&readiness.business.approved);
 const testAvailable=verified&&readiness?.marketingSendsAvailable===true;
 useEffect(()=>{
  setReadiness(null);setNotice('');setError('');
  if(!businessId)return;
  const controller=new AbortController();
  setLoading(true);
  fetch('/api/vendor/marketing/whatsapp/status?businessId='+encodeURIComponent(businessId),{
   credentials:'same-origin',cache:'no-store',signal:controller.signal,
  }).then(async res=>{
   const value:unknown=await res.json();
   if(res.ok&&value&&typeof value==='object'&&'ok' in value&&value.ok===true)
    setReadiness(value as Readiness);
   else setError('Could not verify the connection. Refresh and try again.');
  }).catch(reason=>{
   if(!(reason instanceof Error&&reason.name==='AbortError'))
    setError('Connection status is unavailable.');
  }).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[businessId]);
 async function connect(){
  if(!eligible||!ownerConfirmed||submitting||(!E164.test(phone.trim())&&method==='phone'))return;
  setSubmitting(true);setError('');setNotice('');
  try{
   const res=await fetch('/api/vendor/marketing/whatsapp/onboarding/start',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({businessId,method,phone:method==='phone'?phone.trim():null}),
   });
   const body:unknown=await res.json();
   const result=body&&typeof body==='object'?body as Record<string,unknown>:{};
   if(!res.ok){
    setNotice(result.code==='meta_approval_pending'
     ?'Meta Tech Provider approval is still pending. Your number has not been connected and no verification code was requested.'
     :'Unable to start verified Meta signup. No account was connected.');
    return;
   }
   // Do not treat a mere HTTP success as authorization. Only provider-confirmed
   // server state, never this frontend, may report a connected account.
   setNotice('Meta setup is being prepared. No connection is confirmed yet.');
  }catch{setError('Could not check Meta onboarding readiness. Please try again.');}
  finally{setSubmitting(false);}
 }
 async function sendTest(){
  if(!testAvailable||testSending||!testConsent||!E164.test(recipient.trim()))return;
  setTestSending(true);setTestNotice('');
  try{
   const res=await fetch('/api/vendor/marketing/whatsapp/test-message',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({businessId,recipient:recipient.trim(),consent:true}),
   });
   const value:unknown=await res.json();
   const result=value&&typeof value==='object'?value as Record<string,unknown>:{};
   setTestNotice(res.ok&&result.messageSent===true?'Provider accepted the test message. Check actual delivery status.':
    'Test messaging is not yet approved for this vendor account. Nothing was sent.');
  }catch{setTestNotice('Test messaging is unavailable. Nothing was sent.');}
  finally{setTestSending(false);}
 }
 return <div className="space-y-5 text-[#242429]">
  <div className="rounded-xl border border-[#E5EBE7] bg-[#F7FAF8] p-4 text-xs leading-6 text-[#456556]">
   <div className="flex items-center gap-2 font-bold"><ShieldAlert size={17}/> Official WhatsApp Business Platform</div>
   <p className="mt-1">SLBI will connect only a business number you own, through Meta's official authorization. A normal WhatsApp Web QR is not a Business API connection.</p>
  </div>
  <div>
   <label htmlFor="connector-business" className="mb-2 block text-xs font-extrabold">1. Select your business</label>
   <select id="connector-business" value={businessId} onChange={e=>setBusinessId(e.target.value)}
    className="min-h-11 w-full rounded-xl border border-[#E3E3E7] bg-white px-3 text-sm text-[#26252B] focus:border-[#FF7900] focus:outline-none">
    {businesses.length===0?<option value="">No owned businesses</option>:businesses.map(b=>
     <option key={b.id} value={b.id}>{b.name}{b.status!=='approved'?' · approval pending':''}</option>)}
   </select>
   {!eligible&&<p className="mt-2 text-xs text-[#985B27]">This business must be approved in SLBI before linking its number.</p>}
  </div>
  <div>
   <p className="mb-2 text-xs font-extrabold">2. Choose how to connect</p>
   <div className="grid grid-cols-2 gap-2" role="group" aria-label="WhatsApp connection method">
    <button type="button" onClick={()=>{setMethod('phone');setNotice('');setError('')}}
     aria-pressed={method==='phone'}
     className={'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold '+(method==='phone'
      ?'border-[#FF7900] bg-[#FFF1E6] text-[#A44E0E]':'border-[#E4E4E8] bg-white text-[#686872]')}>
     <Phone size={16}/> Phone number
    </button>
    <button type="button" onClick={()=>{setMethod('qr');setNotice('');setError('')}}
     aria-pressed={method==='qr'}
     className={'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold '+(method==='qr'
      ?'border-[#FF7900] bg-[#FFF1E6] text-[#A44E0E]':'border-[#E4E4E8] bg-white text-[#686872]')}>
     <QrCode size={16}/> QR method
    </button>
   </div>
  </div>
  {method==='phone'?<div className="space-y-2">
   <label htmlFor="whatsapp-e164" className="block text-xs font-bold">Business phone number (international format)</label>
   <input id="whatsapp-e164" type="tel" autoComplete="tel" inputMode="tel" placeholder="+94771234567"
    value={phone} maxLength={16} onChange={e=>setPhone(e.target.value)}
    aria-invalid={phone.length>0&&!E164.test(phone.trim())}
    className="min-h-12 w-full rounded-xl border border-[#E4E4E8] bg-white px-3 text-sm focus:border-[#FF7900] focus:outline-none"/>
   <p className="text-[11px] leading-5 text-[#7D7B83]">Meta will verify number ownership with an official SMS or voice code during Embedded Signup. Do not enter an OTP or password into SLBI.</p>
  </div>:<div className="rounded-xl border border-[#E7E8EB] bg-[#FAFAFB] p-4">
   <p className="flex items-center gap-2 text-xs font-bold"><QrCode size={17}/> WhatsApp Business App coexistence</p>
   <p className="mt-2 text-[11px] leading-6 text-[#706D77]">For eligible existing WhatsApp Business App numbers, Meta Embedded Signup may display its own QR code. You scan that official code from your WhatsApp Business App. SLBI cannot safely create a WhatsApp Web QR and call it a Cloud API connection.</p>
   <p className="mt-2 text-[11px] font-semibold text-[#946029]">Official Meta QR becomes available only inside approved Embedded Signup.</p>
  </div>}
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#EAE9ED] bg-white p-3">
   <input type="checkbox" checked={ownerConfirmed} onChange={e=>setOwnerConfirmed(e.target.checked)}
    className="mt-1 h-4 w-4 accent-[#FF7900]"/>
   <span className="text-xs leading-5 text-[#625F68]">I manage this business and have permission to connect its WhatsApp Business account.</span>
  </label>
  <div className="space-y-2">
   <button type="button" onClick={()=>void connect()}
    disabled={!eligible||!ownerConfirmed||loading||submitting||(method==='phone'&&!E164.test(phone.trim()))}
    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 text-sm font-extrabold text-[#241A10] hover:bg-[#FF9738] disabled:cursor-not-allowed disabled:bg-[#ECECEE] disabled:text-[#85858B]">
    {submitting?<Loader2 size={17} className="animate-spin"/>:<LockKeyhole size={17}/>}
    {submitting?'Checking connection…':'Connect with Meta'}
   </button>
   <p className="text-center text-[11px] leading-5 text-[#85818A]">Meta permission approval is pending. Clicking Connect will check readiness; it will not create a false connection.</p>
   {notice&&<p role="status" className="rounded-lg border border-[#EDD5BA] bg-[#FFF8F1] p-3 text-xs leading-6 text-[#855222]">{notice}</p>}
   {error&&<p role="alert" className="rounded-lg border border-[#E8C7C7] bg-[#FFF4F4] p-3 text-xs text-[#9B3636]">{error}</p>}
  </div>
  <div className="border-t border-[#ECECEF] pt-5">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <h3 className="flex items-center gap-2 text-sm font-extrabold"><MessageSquareText size={17} className="text-[#C66B19]"/>3. Send a test message</h3>
    <span className="rounded-md bg-[#F4F4F5] px-2 py-1 text-[10px] font-bold text-[#777780]">
     {verified?'Verified account':'Not connected'}
    </span>
   </div>
   <p className="mt-2 text-xs leading-6 text-[#73717A]">After Meta confirms your own number and its permitted messaging capability, test an approved message with a opted-in recipient. A template or active 24-hour service window is required where applicable.</p>
   <div className="mt-3 space-y-2">
    <label htmlFor="wa-test-recipient" className="block text-xs font-bold text-[#48474E]">Test recipient number</label>
    <input id="wa-test-recipient" type="tel" inputMode="tel" autoComplete="tel" placeholder="+94771234567"
     disabled={!testAvailable} maxLength={16} value={recipient} onChange={e=>setRecipient(e.target.value)}
     className="min-h-11 w-full rounded-xl border border-[#E4E4E8] bg-white px-3 text-sm disabled:bg-[#F8F8F9] disabled:text-[#9A989F]"/>
    <label className="flex items-start gap-2 text-[11px] leading-5 text-[#77747C]">
     <input type="checkbox" className="mt-1 accent-[#FF7900]" checked={testConsent}
      disabled={!testAvailable} onChange={e=>setTestConsent(e.target.checked)}/>
     I have the recipient's permission to receive a WhatsApp test.
    </label>
   </div>
   <button type="button" onClick={()=>void sendTest()}
    disabled={!testAvailable||!testConsent||!E164.test(recipient.trim())||testSending}
    className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 text-xs font-bold text-[#231C16] hover:bg-[#FF9B43] disabled:cursor-not-allowed disabled:border disabled:border-[#E4E4E7] disabled:bg-[#F4F4F6] disabled:text-[#88858E]">
    <LockKeyhole size={16}/>{testSending?'Checking provider…':testAvailable?'Send test message':'Test message · waiting for connection'}
   </button>
   {testNotice&&<p role="status" className="mt-2 rounded-lg border border-[#EDD9BD] bg-[#FFFAF5] p-3 text-xs text-[#8B5B2A]">{testNotice}</p>}
   {!testAvailable&&<p className="mt-2 text-center text-[11px] text-[#918F96]">No WhatsApp test message has been sent.</p>}
  </div>
 </div>;
}
