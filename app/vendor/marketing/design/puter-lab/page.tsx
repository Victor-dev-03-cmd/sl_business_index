'use client';
/* eslint-disable @next/next/no-img-element */
import {useState} from 'react';
import Link from 'next/link';
import Script from 'next/script';
import {ArrowLeft,FlaskConical,Image as ImageIcon,LoaderCircle,ShieldCheck} from 'lucide-react';

type PuterClient={
  auth:{signIn:()=>Promise<unknown>};
  ai:{txt2img:(prompt:string,options:{model:string;test_mode:boolean})=>Promise<HTMLImageElement>};
};
declare global {interface Window {puter?:PuterClient;}}

const models=[
  {id:'openai/gpt-image-2.6-flare',label:'GPT Image 2.6 Flare'},
  {id:'google/gemini-3-pro-image',label:'Gemini 3 Pro Image'},
  {id:'black-forest-labs/flux-2-pro',label:'FLUX.2 Pro'},
  {id:'qwen/qwen-image',label:'Qwen Image (version unspecified)'},
] as const;
type ModelId=typeof models[number]['id'];
const example='Create an elegant Deepavali-themed software development promotion. Navy and gold technology artwork with glowing lamps. Leave clear, clean space for typography. No words, letters, logos or prices.';

export default function PuterExperimentalStudio(){
  const [loaded,setLoaded]=useState(false);
  const [model,setModel]=useState<ModelId>(models[0].id);
  const [prompt,setPrompt]=useState(example);
  const [realMode,setRealMode]=useState(false);
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [imageSrc,setImageSrc]=useState('');
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');

  const generate=async()=>{
    setError('');setStatus('');setImageSrc('');
    const client=window.puter;
    if(!loaded||!client){setError('Puter.js is not ready. Reload the page and retry.');return;}
    if(prompt.trim().length<10||prompt.length>1500){
      setError('Enter a description between 10 and 1,500 characters.');return;
    }
    if(realMode&&!consent){
      setError('Please explicitly confirm Puter User-Pays charges before real inference.');return;
    }
    setBusy(true);
    try{
      // Must remain inside the user's click handler: popup blockers prevent deferred auth.
      await client.auth.signIn();
      const result=await client.ai.txt2img(prompt.trim(),{
        model,test_mode:!realMode,
      });
      if(!result?.src||typeof result.src!=='string')throw Error('Puter returned no image.');
      setImageSrc(result.src);
      setStatus(realMode?
        'Real model output returned by Puter. Review carefully; nothing was saved to SLBI.':
        'SDK test-mode sample returned. This is NOT a real model-quality evaluation.');
    }catch(e){
      setError(e instanceof Error?e.message:'Puter sign-in or generation failed.');
    }finally{setBusy(false);}
  };

  return <main className="mx-auto max-w-[1180px] space-y-5 px-4 py-5 text-[#252126]">
    <Script src="https://js.puter.com/v2/" strategy="afterInteractive"
      onReady={()=>setLoaded(true)} onError={()=>setError('Could not load Puter.js. Check network/ad-blocking settings.')}/>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-[#252126] p-3 text-[#F4A25A]"><FlaskConical size={21}/></span>
        <div><h1 className="text-xl font-extrabold">Puter AI Image Lab</h1>
          <p className="text-xs text-[#887E82]">Private owner QA experiment · Separate from SLBI poster generation</p></div>
      </div>
      <Link href="/vendor/marketing/design" className="inline-flex items-center gap-1 rounded-full border border-[#E8E2DD] px-4 py-2 text-xs font-semibold">
        <ArrowLeft size={14}/> Creative AI
      </Link>
    </div>
    <div className="flex items-start gap-2 rounded-2xl border border-[#F0D5BA] bg-[#FFFAF3] px-4 py-3 text-xs leading-6 text-[#865A38]">
      <ShieldCheck size={18} className="mt-1 shrink-0"/>
      <p>Uses your own Puter login in the browser. <strong>No API key/token is needed.</strong>
        Puter uses User-Pays billing. Real mode may consume your allowance or incur charges.
        No SLBI Growth Credits, Cloudflare calls, private poster jobs, or publishing are involved.
        This isolated lab does not save images or prompts to SLBI.</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className="space-y-4 rounded-3xl border border-[#EBE6E3] bg-white p-5">
        <div>
          <label htmlFor="puter-model" className="text-xs font-bold">Choose an image model</label>
          <select id="puter-model" value={model} disabled={busy}
            onChange={e=>setModel(e.target.value as ModelId)}
            className="mt-2 w-full rounded-xl border border-[#E6E0DC] bg-[#FCFAF8] p-3 text-sm">
            {models.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <p className="mt-2 text-[11px] text-[#8D8080]">Puter lists qwen/qwen-image but does not identify it as Qwen Image 2.1. Provider quality and spelling need real owner testing.</p>
        </div>
        <div>
          <label htmlFor="puter-prompt" className="text-xs font-bold">Image prompt</label>
          <textarea id="puter-prompt" value={prompt} disabled={busy} maxLength={1500} rows={8}
            onChange={e=>setPrompt(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[#E6E0DC] bg-[#FCFAF8] p-3 text-sm leading-6"/>
        </div>
        <div className="space-y-3 rounded-2xl bg-[#F8F6F5] p-4">
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={realMode} disabled={busy}
              onChange={e=>{setRealMode(e.target.checked);setConsent(false);}}/>
            Use real image generation
          </label>
          <p className="text-xs leading-5 text-[#756F70]">{realMode
            ?'Real inference is subject to Puter usage limits and charges. Check your Puter account balance before continuing.'
            :'Safe test mode returns only a sample image (not proof of model quality) and uses no inference credits.'}</p>
          {realMode&&<label className="flex items-start gap-3 text-xs font-semibold leading-5 text-[#8B592C]">
            <input type="checkbox" checked={consent} disabled={busy}
              onChange={e=>setConsent(e.target.checked)}/>
            I understand this request may consume my Puter AI allowance or create a charge.
          </label>}
        </div>
        <button type="button" onClick={()=>void generate()}
          disabled={busy||!loaded||(realMode&&!consent)||prompt.trim().length<10}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#252126] p-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy?<LoaderCircle size={18} className="animate-spin"/>:<FlaskConical size={18}/>}
          {busy?'Processing…':realMode?'Generate with my Puter allowance':'Run no-credit SDK test'}
        </button>
        {error&&<p role="alert" className="rounded-xl bg-[#FFF1F0] p-3 text-xs text-[#A9382C]">{error}</p>}
        {status&&<p role="status" className="rounded-xl bg-[#F0F8F1] p-3 text-xs text-[#35683E]">{status}</p>}
      </section>
      <section aria-label="Experimental image preview"
        className="flex min-h-[450px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-[#EBE6E3] bg-[#F6F3F1] p-5">
        {imageSrc?<img src={imageSrc} alt="Puter image generated in experimental lab" className="max-h-[670px] w-auto max-w-full rounded-xl object-contain"/>:
          <div className="flex flex-col items-center gap-3 text-center text-[#968D89]">
            <ImageIcon size={44}/>
            <p className="text-sm font-semibold">Experimental output appears here</p>
            <p className="max-w-[360px] text-xs leading-6">No model is called automatically. SDK test mode does not prove image quality. The normal SLBI poster production provider remains unchanged.</p>
          </div>}
      </section>
    </div>
  </main>;
}
