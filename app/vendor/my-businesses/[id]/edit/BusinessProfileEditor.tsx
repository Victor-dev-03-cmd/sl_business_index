'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {Images,BriefcaseBusiness,Upload,X,Save,Loader2} from 'lucide-react';
import {supabase} from '@/lib/supabaseClient';
import {toast} from 'sonner';

const MAX_PHOTOS=12, MAX_SERVICES=10, MAX_BYTES=5*1024*1024;
const ext:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const url=(path:string)=>supabase.storage.from('business-gallery').getPublicUrl(path).data.publicUrl;
export default function BusinessProfileEditor({businessId}:{businessId:string}){
 const [original,setOriginal]=useState<string[]>([]);
 const [paths,setPaths]=useState<string[]>([]);
 const [files,setFiles]=useState<File[]>([]);
 const [services,setServices]=useState('');
 const [loading,setLoading]=useState(true);
 const [ready,setReady]=useState(false);
 const [saving,setSaving]=useState(false);
 const [issue,setIssue]=useState('');
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const {data,error}=await supabase.from('business_profile_content').select('gallery_paths,services').eq('business_id',businessId).maybeSingle();
    if(error)throw error;
    if(active){const initial=data?.gallery_paths||[];setOriginal(initial);setPaths(initial);setServices((data?.services||[]).join('\n'));setReady(true)}
   }catch{if(active)setIssue('Could not load your profile content. Reload before editing.')}
   finally{if(active)setLoading(false)}
  })();
  return()=>{active=false};
 },[businessId]);
 function choose(input:React.ChangeEvent<HTMLInputElement>){
  const selected=Array.from(input.target.files||[]);input.target.value='';
  if(paths.length+files.length+selected.length>MAX_PHOTOS){setIssue('You can add up to 12 gallery photos.');return}
  if(selected.some(file=>!ext[file.type]||file.size<1||file.size>MAX_BYTES)){setIssue('Choose JPG, PNG or WebP files up to 5 MB each.');return}
  setIssue('');setFiles(current=>[...current,...selected]);
 }
 async function save(){
  if(saving||!ready)return;
  const values=[...new Set(services.split('\n').map(v=>v.trim()).filter(Boolean))];
  if(values.length>MAX_SERVICES||values.some(v=>v.length>100)){setIssue('Add up to 10 services, each under 100 characters.');return}
  setSaving(true);setIssue('');
  const uploaded:string[]=[];
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user)throw Error('Please sign in again.');
   const {data:owned,error:ownershipError}=await supabase.from('businesses').select('id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();
   if(ownershipError||!owned)throw Error('You cannot edit this business.');
   for(const file of files){
    const path=businessId+'/'+crypto.randomUUID()+'.'+ext[file.type];
    const {error}=await supabase.storage.from('business-gallery').upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw Error('A gallery image could not be uploaded.');
    uploaded.push(path);
   }
   const next=[...paths,...uploaded];
   const {error}=await supabase.from('business_profile_content').upsert({business_id:businessId,services:values,gallery_paths:next},{onConflict:'business_id'});
   if(error)throw Error('Could not save profile content.');
   const obsolete=original.filter(path=>!next.includes(path));
   setOriginal(next);setPaths(next);setFiles([]);setServices(values.join('\n'));toast.success('Gallery and services saved.');
   if(obsolete.length){const {error:cleanup}=await supabase.storage.from('business-gallery').remove(obsolete);if(cleanup)toast.warning('Photos removed from profile; storage cleanup needs attention.')}
  }catch(error){
   if(uploaded.length)await supabase.storage.from('business-gallery').remove(uploaded).catch(()=>undefined);
   setIssue(error instanceof Error?error.message:'Could not save profile content.');
  }finally{setSaving(false)}
 }
 if(loading)return <div className="flex items-center gap-2 rounded-xl border bg-white p-6 text-sm"><Loader2 className="animate-spin" size={18}/> Loading gallery and services…</div>;
 return <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-7">
  <h2 className="flex items-center gap-2 text-lg font-semibold"><Images size={21}/> Public gallery &amp; services</h2>
  <p className="mt-1 text-sm text-neutral-500">Add actual business photos and services to your public listing. Save this section separately.</p>
  <div className="my-5 flex flex-wrap gap-3">
   {paths.map((path,index)=><div key={path} className="relative h-24 w-28 overflow-hidden rounded-lg border bg-neutral-50"><Image src={url(path)} alt={'Gallery photo '+(index+1)} fill sizes="112px" className="object-cover"/><button type="button" disabled={saving} aria-label={'Remove photo '+(index+1)} onClick={()=>setPaths(current=>current.filter(v=>v!==path))} className="absolute right-1 top-1 rounded-md bg-black/70 p-1.5 text-white"><X size={14}/></button></div>)}
   {files.map((file,index)=><div key={file.name+'-'+index} className="relative grid h-24 w-28 place-items-center overflow-hidden rounded-lg border bg-neutral-50 p-2 text-center text-xs break-all"><span>{file.name}</span><button type="button" disabled={saving} aria-label={'Remove selected file '+(index+1)} onClick={()=>setFiles(current=>current.filter((_,i)=>i!==index))} className="absolute right-1 top-1 rounded-md bg-black/70 p-1.5 text-white"><X size={14}/></button></div>)}
   {paths.length+files.length<MAX_PHOTOS&&<label className="flex h-24 w-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-600 hover:bg-neutral-50"><Upload size={21}/> Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={saving||!ready} onChange={choose} className="sr-only"/></label>}
  </div>
  <p className="mb-6 text-xs text-neutral-500">{paths.length+files.length}/12 photos · Max 5 MB each · JPG, PNG, WebP. Only upload photos intended for public viewing.</p>
  <label htmlFor="public-services" className="flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness size={17}/> Services (one per line)</label>
  <textarea id="public-services" rows={5} maxLength={1009} disabled={saving||!ready} value={services} onChange={event=>setServices(event.target.value)} placeholder={'Service 1\nService 2\nService 3'} className="mt-2 w-full rounded-lg border border-neutral-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"/>
  <p className="mt-1 text-xs text-neutral-500">Up to 10 services, 100 characters each.</p>
  {issue&&<p role="alert" className="mt-3 text-sm text-red-700">{issue}</p>}
  <button type="button" disabled={saving||!ready} onClick={()=>void save()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Save gallery &amp; services</button>
 </section>
}
