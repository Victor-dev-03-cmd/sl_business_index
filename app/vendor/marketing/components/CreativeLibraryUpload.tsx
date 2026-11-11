'use client';

import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {toast} from 'sonner';
import {Check,FileImage,Loader2,UploadCloud} from 'lucide-react';

type Business={id:string;name:string};
const allowed=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
const channels=['facebook','instagram','linkedin','whatsapp'] as const;

export default function CreativeLibraryUpload({business,onSuccess}:{business:Business|null;onSuccess:()=>void}){
  const [open,setOpen]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [caption,setCaption]=useState('');
  const [selected,setSelected]=useState<string[]>(['facebook','instagram']);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);setPreview(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);
  const toggle=(c:string)=>setSelected(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c]);
  const submit=async()=>{
    if(!business){toast.error('Select your business first.');return;}
    if(!file||!allowed.has(file.type)||file.size===0||file.size>8*1024*1024){
      toast.error('Choose a JPG, PNG or WebP image up to 8MB.');return;
    }
    if(caption.trim().length<5||caption.trim().length>1500){
      toast.error('Write a caption between 5 and 1500 characters.');return;
    }
    if(!selected.length){toast.error('Choose a channel.');return;}
    setSaving(true);let uploadedPath:string|null=null;
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw new Error('Sign in required');
      const {data:owner,error:ownerError}=await supabase.from('businesses')
        .select('id').eq('id',business.id).eq('owner_id',user.id).maybeSingle();
      if(ownerError||!owner)throw new Error('Business ownership could not be confirmed');
      const path=user.id+'/'+business.id+'/'+crypto.randomUUID()+'.'+allowed.get(file.type);
      const {error:uploadError}=await supabase.storage.from('promotions').upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError)throw uploadError;uploadedPath=path;
      const {data}=supabase.storage.from('promotions').getPublicUrl(path);
      const imageUrl=data.publicUrl;
      if(!imageUrl.startsWith('https://'))throw new Error('Media URL unavailable');
      const {error:saveError}=await supabase.from('promotions').insert({
        business_id:business.id,vendor_id:user.id,image_url:imageUrl,
        caption:caption.trim(),social_platforms:selected,status:'pending',
      });
      if(saveError)throw saveError;
      setFile(null);setCaption('');setOpen(false);
      toast.success('Creative asset saved for review. No social platform was posted to.');
      onSuccess();
    }catch(e){
      if(uploadedPath)void supabase.storage.from('promotions').remove([uploadedPath]);
      toast.error(e instanceof Error?e.message:'Unable to upload creative');
    }finally{setSaving(false);}
  };

  return <div className="rounded-md border border-[#DDE8DD] bg-[#F8FBF8] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><FileImage size={18} className="text-[#377B51]"/><div><h3 className="text-[13px] font-bold text-[#254B35]">Upload a finished creative</h3><p className="mt-1 text-[11px] text-[#768D7C]">Add an existing poster or image. No canvas editing required.</p></div></div>
      <button type="button" onClick={()=>setOpen(v=>!v)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#BCD1C1] bg-white px-3 text-xs font-bold text-[#2B6744]"><UploadCloud size={15}/>{open?'Close':'Upload creative'}</button>
    </div>
    {open&&<div className="mt-4 grid min-w-0 gap-4 border-t border-[#E2ECE2] pt-4 md:grid-cols-[150px_minmax(0,1fr)]">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-dashed border-[#CEDFCD] bg-white">
        {preview?<img src={preview} alt="Local image preview" className="h-full w-full object-contain"/>:<FileImage size={36} className="text-[#A0B6A3]"/>}
      </div>
      <div className="min-w-0 space-y-3">
        <label className="block text-[11px] font-bold">Image file · JPG / PNG / WebP · up to 8MB
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-1 block w-full rounded-md border border-[#D4E2D7] bg-white p-2 text-xs"/>
        </label>
        <label className="block text-[11px] font-bold">Caption
          <textarea className="mt-1 block min-h-24 w-full rounded-md border border-[#D4E2D7] bg-white p-2.5 text-[12px]" maxLength={1500} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Your approved product details and campaign terms…"/>
        </label>
        <fieldset><legend className="mb-2 text-[11px] font-bold">Intended channels</legend><div className="flex flex-wrap gap-2">{channels.map(c=><button type="button" key={c} aria-pressed={selected.includes(c)} onClick={()=>toggle(c)} className={'rounded-md border px-3 py-1.5 text-[11px] font-bold '+(selected.includes(c)?'border-[#539269] bg-[#E7F4E7] text-[#2A7047]':'border-[#DCE5DB] text-[#829386]')}>{selected.includes(c)&&<Check size={11} className="mr-1 inline"/>}{c}</button>)}</div></fieldset>
        <button type="button" disabled={saving||!file||!business} onClick={()=>void submit()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#296447] px-4 text-xs font-bold text-white disabled:opacity-50">{saving?<Loader2 size={15} className="animate-spin"/>:<UploadCloud size={15}/>} Save to library</button>
        <p className="text-[10px] leading-5 text-[#8A988B]">The creative enters internal review; it is not published to Facebook, Instagram or email automatically.</p>
      </div>
    </div>}
  </div>;
}
