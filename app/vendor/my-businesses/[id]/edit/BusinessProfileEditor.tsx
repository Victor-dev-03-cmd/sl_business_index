'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {Images,BriefcaseBusiness,Upload,X,Save,Loader2,Plus,ChevronLeft,ChevronRight,CheckCircle2,Info} from 'lucide-react';
import {supabase} from '@/lib/supabaseClient';
import {toast} from 'sonner';

const MAX_PHOTOS=12, MAX_SERVICES=10, MAX_BYTES=5*1024*1024;
const ext:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const url=(path:string)=>supabase.storage.from('business-gallery').getPublicUrl(path).data.publicUrl;
type Photo={id:string;path:string}|{id:string;file:File};
type Service={id:string;name:string};
const pgArray=(items:string[])=>'{'+items.map(item=>'"'+item.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"').join(',')+'}';
const savedPhoto=(path:string):Photo=>({id:path,path});
const savedService=(name:string,index:number):Service=>({id:'saved-'+index,name});
const normalise=(rows:Service[])=>[...new Set(rows.map(row=>row.name.trim()).filter(Boolean))];

function Preview({photo,index}:{photo:Photo;index:number}){
 const [local,setLocal]=useState<string|null>(null);
 const file='file' in photo?photo.file:null;
 useEffect(()=>{
  if(!file)return;
  const objectUrl=URL.createObjectURL(file);
  setLocal(objectUrl);
  return()=>URL.revokeObjectURL(objectUrl);
 },[file]);
 if('path' in photo)return <Image src={url(photo.path)} alt={'Gallery photo '+(index+1)} fill sizes="(max-width:640px) 45vw, 200px" className="object-cover"/>;
 return local?<img src={local} alt={photo.file.name} className="h-full w-full object-cover"/>:<div className="grid h-full w-full place-items-center text-neutral-400"><Images size={24}/></div>;
}

export default function BusinessProfileEditor({businessId,onDirtyChange,onSavingChange}:{businessId:string;onDirtyChange?:(value:boolean)=>void;onSavingChange?:(value:boolean)=>void}){
 const [original,setOriginal]=useState<{paths:string[];services:string[]}>({paths:[],services:[]});
 const [photos,setPhotos]=useState<Photo[]>([]);
 const [services,setServices]=useState<Service[]>([]);
 const [loading,setLoading]=useState(true);
 const [ready,setReady]=useState(false);
 const [saving,setSaving]=useState(false);
 const [issue,setIssue]=useState('');
 const [saved,setSaved]=useState(false);
 const [retry,setRetry]=useState(0);
 const locked=useRef(false);
 const currentPaths=photos.map(p=>'path' in p?p.path:'new:'+p.id);
 const values=normalise(services);
 const dirty=ready&&(JSON.stringify(currentPaths)!==JSON.stringify(original.paths)||JSON.stringify(values)!==JSON.stringify(original.services));
 const editable=ready&&!saving;
 useEffect(()=>{onDirtyChange?.(dirty)},[dirty,onDirtyChange]);
 useEffect(()=>{onSavingChange?.(saving)},[saving,onSavingChange]);
 useEffect(()=>{
  if(!dirty&&!saving)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
  window.addEventListener('beforeunload',guard);
  return()=>window.removeEventListener('beforeunload',guard);
 },[dirty,saving]);
 useEffect(()=>{
  let active=true;
  setLoading(true);setReady(false);setIssue('');setSaved(false);
  void (async()=>{
   try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)throw Error('Please sign in again.');
    const {data:owned,error:ownershipError}=await supabase.from('businesses').select('id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();
    if(ownershipError||!owned)throw Error('You cannot edit this business.');
    const {data,error}=await supabase.from('business_profile_content').select('gallery_paths,services').eq('business_id',businessId).maybeSingle();
    if(error)throw Error('Could not load your gallery and services.');
    if(!active)return;
    const paths=(data?.gallery_paths||[]) as string[],names=(data?.services||[]) as string[];
    setOriginal({paths,services:names});setPhotos(paths.map(savedPhoto));setServices(names.map(savedService));setReady(true);
   }catch(error){if(active)setIssue(error instanceof Error?error.message:'Unable to load profile content.')}
   finally{if(active)setLoading(false)}
  })();
  return()=>{active=false};
 },[businessId,retry]);
 function changePhotos(next:Photo[]){setPhotos(next);setSaved(false);setIssue('')}
 function choose(input:React.ChangeEvent<HTMLInputElement>){
  const selected=Array.from(input.target.files||[]);input.target.value='';
  if(!editable||!selected.length)return;
  if(photos.length+selected.length>MAX_PHOTOS){setIssue('You can add up to 12 gallery photos.');return}
  if(selected.some(file=>!ext[file.type]||file.size<1||file.size>MAX_BYTES)){setIssue('Choose JPG, PNG or WebP files up to 5 MB each.');return}
  changePhotos([...photos,...selected.map(file=>({id:crypto.randomUUID(),file}))]);
 }
 function move(index:number,direction:number){
  const next=index+direction;if(!editable||next<0||next>=photos.length)return;
  const ordered=[...photos];[ordered[index],ordered[next]]=[ordered[next],ordered[index]];changePhotos(ordered);
 }
 function changeServices(next:Service[]){setServices(next);setSaved(false);setIssue('')}
 async function save(){
  if(locked.current||!editable||!dirty)return;
  const values=normalise(services);
  if(values.length>MAX_SERVICES||values.some(v=>v.length>100)){setIssue('Add up to 10 services, each at most 100 characters.');return}
  locked.current=true;setSaving(true);setIssue('');setSaved(false);
  const uploaded:string[]=[];
  let writeAttempted=false,committed=false;
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user)throw Error('Please sign in again.');
   const {data:owned,error:ownershipError}=await supabase.from('businesses').select('id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();
   if(ownershipError||!owned)throw Error('You cannot edit this business.');
   // Detect changes from another editor before uploading.
   const {data:latest,error:latestError}=await supabase.from('business_profile_content').select('gallery_paths,services').eq('business_id',businessId).maybeSingle();
   if(latestError)throw Error('Could not check the current profile. Please retry.');
   if(JSON.stringify(latest?.gallery_paths||[])!==JSON.stringify(original.paths)||JSON.stringify(latest?.services||[])!==JSON.stringify(original.services))throw Error('This profile changed elsewhere. Reload this page before saving again.');
   const next:string[]=[];
   for(const photo of photos){
    if('path' in photo){next.push(photo.path);continue}
    const file=photo.file;
    const path=businessId+'/'+crypto.randomUUID()+'.'+ext[file.type];
    const {error}=await supabase.storage.from('business-gallery').upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw Error('A gallery image could not be uploaded. Please retry.');
    uploaded.push(path);next.push(path);
   }
   writeAttempted=true;
   // Match the original content on update so a concurrent edit cannot be overwritten.
   const payload={services:values,gallery_paths:next};
   const query=latest
    ?supabase.from('business_profile_content').update(payload).eq('business_id',businessId).eq('gallery_paths',pgArray(original.paths)).eq('services',pgArray(original.services)).select('business_id').maybeSingle()
    :supabase.from('business_profile_content').insert({business_id:businessId,...payload}).select('business_id').single();
   const {data:result,error}=await query;
   if(error||!result)throw Error('Unable to confirm the save. Reload the profile before trying again.');
   committed=true;
   const obsolete=original.paths.filter(path=>!next.includes(path));
   setOriginal({paths:next,services:values});setPhotos(next.map(savedPhoto));setServices(values.map(savedService));setSaved(true);
   toast.success('Gallery and services saved.');
   if(obsolete.length){
    try{const {error:cleanup}=await supabase.storage.from('business-gallery').remove(obsolete);if(cleanup)toast.warning('Photos removed from the profile. Storage cleanup needs attention.')}catch{toast.warning('Photos removed from the profile. Storage cleanup needs attention.')}
   }
  }catch(error){
   // Never delete assets after an uncertain database write: it may have committed.
   if(uploaded.length&&!writeAttempted)await supabase.storage.from('business-gallery').remove(uploaded).catch(()=>undefined);
   if(!committed)setIssue(error instanceof Error?error.message:'Could not save profile content.');
   if(writeAttempted&&!committed)setReady(false);
  }finally{locked.current=false;setSaving(false)}
 }
 if(loading)return <div role="status" className="flex min-h-40 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-6 text-sm"><Loader2 className="animate-spin" size={18}/> Loading gallery and services…</div>;
 return <div className="space-y-5">
  <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
   <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Images size={22} className="text-[#E66D00]"/> Business gallery</h2><p className="mt-1 text-sm text-neutral-500">Upload real business photos for your Bento gallery.</p></div><span className="shrink-0 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold tabular-nums">{photos.length}/{MAX_PHOTOS}</span></div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
     {photos.map((photo,index)=><div key={photo.id} className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100"><Preview photo={photo} index={index}/><span className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-1 text-[10px] font-medium text-white">{index===0?'First photo':index+1}</span><button type="button" aria-label={'Remove photo '+(index+1)} disabled={!editable} onClick={()=>changePhotos(photos.filter(p=>p.id!==photo.id))} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-black/70 text-white disabled:opacity-40"><X size={17}/></button></div>
      <div className="flex items-center justify-between gap-1 p-1.5"><button type="button" aria-label={'Move photo '+(index+1)+' earlier'} disabled={!editable||index===0} onClick={()=>move(index,-1)} className="grid h-9 w-9 place-items-center rounded border border-neutral-200 disabled:opacity-35"><ChevronLeft size={17}/></button><span className="text-[10px] text-neutral-500">{'file' in photo?'New':'Saved'}</span><button type="button" aria-label={'Move photo '+(index+1)+' later'} disabled={!editable||index===photos.length-1} onClick={()=>move(index,1)} className="grid h-9 w-9 place-items-center rounded border border-neutral-200 disabled:opacity-35"><ChevronRight size={17}/></button></div>
     </div>)}
     {photos.length<MAX_PHOTOS&&<label className={'relative flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-3 text-center '+(editable?'cursor-pointer hover:bg-orange-50':'opacity-50')}><Upload size={24} className="text-orange-600"/><span className="text-sm font-semibold">Add photos</span><span className="text-[11px] text-neutral-500">Choose files</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!editable} onChange={choose} aria-label="Upload business gallery photos" className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/></label>}
    </div>
    <p className="mt-4 text-xs leading-5 text-neutral-500">JPG, PNG or WebP · Max 5 MB per image. Only upload images intended for public viewing. Use the arrows to set gallery order. Logo and cover image are managed separately.</p>
   </section>
   <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><BriefcaseBusiness size={22} className="text-[#E66D00]"/> Business services</h2><p className="mt-1 text-sm text-neutral-500">List the products or services customers can request.</p></div><span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold tabular-nums">{services.length}/{MAX_SERVICES}</span></div>
    <div className="mt-5 space-y-2">
     {!services.length&&<div className="rounded-lg border border-dashed border-neutral-200 p-5 text-center text-sm text-neutral-500">No services added. Select Add service to get started.</div>}
     {services.map((row,index)=><div key={row.id} className="flex min-w-0 items-center gap-2"><span className="w-5 shrink-0 text-right text-xs tabular-nums text-neutral-500">{index+1}.</span><input aria-label={'Service '+(index+1)} value={row.name} maxLength={100} placeholder="Enter service name" disabled={!editable} onChange={e=>changeServices(services.map(s=>s.id===row.id?{...s,name:e.target.value}:s))} className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"/><button type="button" aria-label={'Remove service '+(index+1)} disabled={!editable} onClick={()=>changeServices(services.filter(s=>s.id!==row.id))} className="grid h-11 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"><X size={17}/></button></div>)}
    </div>
    <button type="button" disabled={!editable||services.length>=MAX_SERVICES} onClick={()=>changeServices([...services,{id:crypto.randomUUID(),name:''}])} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-[#A34B00] disabled:opacity-45"><Plus size={18}/> Add service</button>
    <p className="mt-3 text-xs text-neutral-500">Up to 10 services, 100 characters each. Blank and duplicate names are ignored when saved.</p>
   </section>
  </div>
  {issue&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><span>{issue}</span>{!ready&&<button type="button" onClick={()=>setRetry(v=>v+1)} className="font-semibold underline">Reload saved content</button>}</div>}
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
   <div className="flex items-center gap-2 text-sm text-neutral-600">{saved?<CheckCircle2 size={18} className="text-green-600"/>:<Info size={18}/>}<span role="status">{saving?'Saving your profile…':saved?'Changes saved successfully':dirty?'Unsaved changes':'Your gallery and services are up to date'}</span></div>
   <div className="flex flex-wrap gap-2"><button type="button" disabled={!editable||!dirty} onClick={()=>{setPhotos(original.paths.map(savedPhoto));setServices(original.services.map(savedService));setIssue('');setSaved(false)}} className="min-h-11 rounded-lg border border-neutral-200 px-4 text-sm font-semibold disabled:opacity-40">Discard changes</button><button type="button" disabled={!editable||!dirty} onClick={()=>void save()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#202024] px-5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-40">{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Save gallery &amp; services</button></div>
  </div>
 </div>;
}
