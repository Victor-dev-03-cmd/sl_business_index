'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabaseClient';
import IconsaxIcon from '../../components/IconsaxIcon';
import {CAPTION_LANGUAGES,CAPTION_OBJECTIVES,type CaptionLanguage,type CaptionObjective} from '@/lib/marketing/caption-contract';

type Business={id:string;name:string;city:string|null;category:string};
type Draft={id:string;business_id?:string;caption:string;language:CaptionLanguage;review_status:string;created_at?:string;updated_at?:string};
const input='w-full rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#FF7900] focus:ring-2 focus:ring-[#FF7900]/15';
const languages:Record<CaptionLanguage,string>={en:'English',ta:'தமிழ்',si:'සිංහල'};
const objectives:Record<CaptionObjective,string>={
  awareness:'Brand awareness',promotion:'Promotion',enquiries:'Customer enquiries',announcement:'Announcement',
};
const card='rounded-xl border border-[#E9E9ED] bg-white p-5 sm:p-6';
const parse=async(resp:Response):Promise<Record<string,any>>=>{
  try{return await resp.json() as Record<string,any>;}catch{return {error:'Service response is unavailable.'};}
};
export default function CaptionLab(){
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [objective,setObjective]=useState<CaptionObjective>('awareness');
  const [language,setLanguage]=useState<CaptionLanguage>('en');
  const [message,setMessage]=useState('');
  const [conditions,setConditions]=useState('');
  const [cta,setCta]=useState('');
  const [drafts,setDrafts]=useState<Draft[]>([]);
  const [draftEdits,setDraftEdits]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const selected=useMemo(()=>businesses.find(b=>b.id===businessId),[businesses,businessId]);
  const loadBusinesses=useCallback(async()=>{
    setError('');setLoading(true);
    try{
      const {data:{user},error:authErr}=await supabase.auth.getUser();
      if(authErr||!user)throw new Error('Sign in to use your Marketing Studio.');
      const {data,error:dbErr}=await supabase.from('businesses')
        .select('id,name,city,category').eq('owner_id',user.id).order('name').limit(250);
      if(dbErr)throw new Error('Unable to load your businesses.');
      const list=(data||[]) as Business[];
      setBusinesses(list);
      setBusinessId(current=>list.some(x=>x.id===current)?current:list[0]?.id||'');
    }catch(e){setError(e instanceof Error?e.message:'Business list unavailable.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void loadBusinesses();},[loadBusinesses]);
  const reload=useCallback(async(signal?:AbortSignal)=>{
    if(!businessId){setDrafts([]);return;}
    try{
      const resp=await fetch('/api/marketing/caption?businessId='+encodeURIComponent(businessId),{
        method:'GET',cache:'no-store',credentials:'same-origin',signal,
      });
      const data=await parse(resp);
      if(!resp.ok)throw new Error(String(data.error||'Unable to fetch AI drafts.'));
      if(signal?.aborted)return;
      const d=(Array.isArray(data.drafts)?data.drafts:[]) as Draft[];
      setDrafts(d);
      setDraftEdits(Object.fromEntries(d.map(x=>[x.id,x.caption])));
    }catch(e){if(!signal?.aborted)setNotice(e instanceof Error?e.message:'Draft history is unavailable.');}
  },[businessId]);
  useEffect(()=>{const ctrl=new AbortController();void reload(ctrl.signal);return()=>ctrl.abort();},[reload]);

  const generate=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!businessId||busy||message.trim().length<5)return;
    setBusy(true);setError('');setNotice('');
    try{
      const resp=await fetch('/api/marketing/caption',{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          businessId,requestKey:crypto.randomUUID(),objective,language,
          message,conditions,cta,
        }),
      });
      const result=await parse(resp);
      if(!resp.ok)throw new Error(String(result.error||'AI caption request failed.'));
      if(!result.draft?.id)throw new Error('Provider result was not saved safely.');
      setNotice('AI draft saved. Verify the language, every business fact and offer condition, then approve explicitly.');
      await reload();
    }catch(err){setError(err instanceof Error?err.message:'AI caption unavailable.');}
    finally{setBusy(false);}
  };
  const review=async(id:string,status:'pending_review'|'approved'|'rejected')=>{
    const caption=(draftEdits[id]||'').trim();
    if(caption.length<2){setError('Enter the text you want to save.');return;}
    setBusy(true);setError('');setNotice('');
    try{
      const resp=await fetch('/api/marketing/caption',{
        method:'PATCH',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id,caption,status}),
      });
      const result=await parse(resp);
      if(!resp.ok)throw new Error(String(result.error||'Cannot save this review.'));
      setNotice(status==='approved'
        ? 'Caption approved by you. No external publishing has occurred.'
        : status==='rejected'?'Caption rejected and retained for audit.':'Edited caption saved for review.');
      await reload();
    }catch(e){setError(e instanceof Error?e.message:'Cannot save caption review.');}
    finally{setBusy(false);}
  };
  return <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-10 text-[#26262D]">
    <header className={card+' flex flex-wrap items-end justify-between gap-4'}>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#CA6617]">SLBI Marketing Engine / P2-02</p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">AI Caption Lab</h1>
        <p className="mt-2 max-w-[700px] text-xs leading-6 text-[#76767E]">
          Draft business-aware social captions in English, Tamil or Sinhala.
          Generated text always needs owner review. AI usage is disabled until
          secure credits and provider spending limits are explicitly enabled.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/vendor/marketing/brand" className="inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-xs font-bold text-[#AF5511] hover:bg-[#FFF5ED]">
          <IconsaxIcon name="shop" size={16}/> Brand Profile
        </Link>
        <Link href="/vendor/marketing" className="inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-xs font-bold hover:bg-[#FAFAFA]">
          <IconsaxIcon name="arrow-left-2" size={16}/> Marketing Studio
        </Link>
      </div>
    </header>
    {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{error}</div>}
    {notice&&<div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-[#6E4A1D]">{notice}</div>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(370px,.9fr)]">
      <form onSubmit={e=>void generate(e)} className={card+' space-y-4'}>
        <div>
          <h2 className="text-sm font-bold">Business-aware creative brief</h2>
          <p className="mt-1 text-xs leading-5 text-[#7B7B83]">Use only genuine offers and facts. Never provide personal customer information.</p>
        </div>
        <label className="block text-xs font-bold">Your business
          <select value={businessId} onChange={e=>setBusinessId(e.target.value)}
            disabled={loading} className={input+' mt-1.5'}>
            {!businesses.length&&<option value="">No owned businesses</option>}
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        {selected&&<p className="text-[11px] text-[#8A8A91]">{selected.category} · {selected.city||'Sri Lanka'} · Uses Brand Profile guidelines</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold">Campaign objective
            <select className={input+' mt-1.5'} value={objective} onChange={e=>setObjective(e.target.value as CaptionObjective)}>
              {CAPTION_OBJECTIVES.map(o=><option key={o} value={o}>{objectives[o]}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold">Target language
            <select className={input+' mt-1.5'} value={language} onChange={e=>setLanguage(e.target.value as CaptionLanguage)}>
              {CAPTION_LANGUAGES.map(l=><option key={l} value={l}>{languages[l]}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-bold">Factual campaign message
          <textarea required minLength={5} maxLength={600} rows={4}
            value={message} onChange={e=>setMessage(e.target.value)}
            className={input+' mt-1.5 resize-y'} placeholder="Describe a real product, service or promotion, without inventing prices or achievements."/>
        </label>
        <label className="block text-xs font-bold">Offer conditions (optional)
          <textarea maxLength={300} rows={2} value={conditions}
            onChange={e=>setConditions(e.target.value)}
            className={input+' mt-1.5 resize-y'} placeholder="Availability, valid dates or other true limitations"/>
        </label>
        <label className="block text-xs font-bold">Call to action (optional)
          <input maxLength={180} value={cta} onChange={e=>setCta(e.target.value)}
            className={input+' mt-1.5'} placeholder="Contact our shop for details"/>
        </label>
        <div className="rounded-lg border border-[#F2D6B9] bg-[#FFFAF4] p-3 text-[11px] leading-5 text-[#725334]">
          AI requests use a per-user daily limit, platform-wide budget and transactional Growth Credits.
          A provider failure should trigger a compensating refund. No credits are charged by this form
          while the AI service is disabled.
        </div>
        <button type="submit" disabled={busy||!businessId||message.trim().length<5}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#242429] px-5 text-xs font-extrabold text-white hover:bg-[#39393D] disabled:opacity-40">
          <IconsaxIcon name="flash" color="white" size={17}/>
          {busy?'Processing…':'Generate and save for review'}
        </button>
      </form>

      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold">Private caption drafts</h2>
            <p className="mt-1 text-xs text-[#777780]">Saved drafts remain private until explicitly reviewed.</p></div>
          <button type="button" onClick={()=>void reload()} disabled={busy}
            className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-[#FAFAFB]">Refresh</button>
        </div>
        <div className="mt-4 max-h-[700px] space-y-4 overflow-y-auto pr-0.5">
          {drafts.map(d=><div key={d.id} className="rounded-lg border border-[#ECECF1] bg-[#FAFAFC] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-[#BB6318]">{languages[d.language]} · {d.review_status.replace('_',' ')}</span>
              <span className="text-[10px] text-[#8B8B92]">{d.created_at?new Date(d.created_at).toLocaleDateString('en-LK'):'Saved draft'}</span>
            </div>
            <label className="text-xs font-bold">Review and edit the full caption
              <textarea rows={7} maxLength={3000} value={draftEdits[d.id]??d.caption}
                onChange={e=>setDraftEdits(s=>({...s,[d.id]:e.target.value}))}
                className={input+' mt-2 resize-y text-xs leading-6'}/>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={()=>void review(d.id,'approved')}
                className="rounded-lg bg-[#202024] px-3.5 py-2 text-[11px] font-bold text-white disabled:opacity-40">
                Approve edited caption
              </button>
              <button type="button" disabled={busy} onClick={()=>void review(d.id,'pending_review')}
                className="rounded-lg border border-[#E6E6EA] bg-white px-3.5 py-2 text-[11px] font-bold disabled:opacity-40">
                Save edits
              </button>
              <button type="button" disabled={busy} onClick={()=>void review(d.id,'rejected')}
                className="rounded-lg border border-[#EEC9C9] px-3.5 py-2 text-[11px] font-bold text-red-700 disabled:opacity-40">
                Reject
              </button>
            </div>
          </div>)}
          {!drafts.length&&<p className="rounded-lg border border-dashed border-[#E2E2E7] p-6 text-xs leading-6 text-[#777781]">
            No saved AI captions for this business yet. Existing manual drafting is still available in Marketing Studio.
          </p>}
        </div>
      </section>
    </div>
  </div>;
}
