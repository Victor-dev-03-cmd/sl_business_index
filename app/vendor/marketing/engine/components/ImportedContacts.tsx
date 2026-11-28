'use client';
import {useEffect,useState,useRef} from 'react';
import {Upload,FileSpreadsheet,Trash2} from 'lucide-react';
import {EMAIL_IMPORT_MAX_BYTES,parseContactText,type ImportPreview,type ImportSource} from '@/lib/marketing/email-import-contract';
type List={id:string;name:string;source:ImportSource;total:number;eligible:number};
type Contact={email:string;suppressed:boolean};
export default function ImportedContacts({businessId}:{businessId:string}){
 const [lists,setLists]=useState<List[]>([]),[contacts,setContacts]=useState<Contact[]>([]);
 const [selected,setSelected]=useState(''),[offset,setOffset]=useState(0),[revision,setRevision]=useState(0);
 const [name,setName]=useState(''),[source,setSource]=useState<ImportSource>('paste'),[text,setText]=useState('');
 const [preview,setPreview]=useState<ImportPreview|null>(null),[attested,setAttested]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const fileRef=useRef<HTMLInputElement>(null),generation=useRef(0);
 useEffect(()=>{generation.current++;setPreview(null);setName('');setText('');setAttested(false);setSelected('');setOffset(0);setLists([]);setContacts([]);setSuccess('');setError('');},[businessId]);
 useEffect(()=>{
   const c=new AbortController();if(!businessId)return;
   const params=new URLSearchParams({businessId,offset:String(offset)});if(selected)params.set('listId',selected);
   void fetch('/api/marketing/email/imports?'+params,{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(!c.signal.aborted){setLists(d.lists);setContacts(d.contacts);}}).catch(e=>{if(!c.signal.aborted){setError(e.message||'Lists unavailable.');setContacts([]);}});
   return()=>c.abort();
 },[businessId,selected,offset,revision]);
 const prepare=async(file:File)=>{
   const run=++generation.current;setPreview(null);setAttested(false);setError('');setSuccess('');setBusy(true);
   try{
     const ext=file.name.split('.').pop()?.toLowerCase();
     if(!ext||!['xlsx','csv','txt'].includes(ext))throw Error('Choose .xlsx, .csv or .txt. Save old .xls workbooks as .xlsx or CSV.');
     if(!file.size||file.size>EMAIL_IMPORT_MAX_BYTES)throw Error('Choose a file up to 2 MB.');
     const result=ext==='xlsx'?await (await import('@/lib/marketing/email-import-xlsx')).parseContactXlsx(await file.arrayBuffer()):parseContactText(await file.text());
     if(run!==generation.current)return;
     setSource(ext as ImportSource);setPreview(result);setText('');setName(file.name.replace(/\.[^.]+$/,'').slice(0,100));
   }catch(e){if(run===generation.current)setError(e instanceof Error?e.message:'Unable to read file.');}finally{if(run===generation.current)setBusy(false);if(fileRef.current)fileRef.current.value='';}
 };
 const prepareText=()=>{setError('');setSuccess('');setAttested(false);setPreview(null);try{if(new TextEncoder().encode(text).length>EMAIL_IMPORT_MAX_BYTES)throw Error('Text exceeds 2 MB.');setSource('paste');setPreview(parseContactText(text));}catch(e){setError(e instanceof Error?e.message:'Invalid list.')}};
 const save=async()=>{
   if(!preview?.emails.length||!attested||!name.trim()||busy)return;
   const run=generation.current;setBusy(true);setError('');
   try{
     const r=await fetch('/api/marketing/email/imports',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({businessId,name,source,emails:preview.emails,attested})});
     const d=await r.json();if(!r.ok)throw Error(d.error);
     if(run!==generation.current)return;
     setSelected(d.id);setOffset(0);setPreview(null);setText('');setAttested(false);setName('');setSuccess(d.total+' contacts saved.');setRevision(x=>x+1);
   }catch(e){if(run===generation.current)setError(e instanceof Error?e.message:'Save failed.');}finally{if(run===generation.current)setBusy(false)}
 };
 const remove=async(listId:string,email?:string)=>{
   if(busy||!window.confirm(email?'Remove this contact from the list?':'Delete this contact list? Saved campaigns using it will require another list.'))return;
   const run=generation.current;setBusy(true);setError('');
   try{const r=await fetch('/api/marketing/email/imports',{method:'DELETE',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({businessId,listId,email})});const d=await r.json();if(!r.ok)throw Error(d.error);if(run!==generation.current)return;if(!email){setSelected('');setContacts([]);}setOffset(0);setRevision(x=>x+1);setSuccess(email?'Contact removed.':'List deleted.');}
   catch(e){if(run===generation.current)setError(e instanceof Error?e.message:'Remove failed.');}finally{if(run===generation.current)setBusy(false);}
 };
 const input='w-full rounded-lg border border-[#DDE1E6] bg-white px-3 py-2 text-sm';
 const action='rounded-lg border border-[#DDE1E6] px-3 py-2 text-xs font-medium disabled:opacity-40';
 return <section className="space-y-4 rounded-xl border border-[#E5E7EB] p-4 text-neutral-900" data-testid="imported-contacts">
   <header><h3 className="flex items-center gap-2 text-base font-semibold"><FileSpreadsheet size={19} className="text-[#EA580C]"/> Imported contacts</h3><p className="mt-1 text-xs text-neutral-500">Upload your own marketing list. Excel (.xlsx), CSV, TXT or paste. Up to 5,000 unique addresses per list, 2 MB per file.</p></header>
   <div className="space-y-2 rounded-lg border border-dashed p-3">
     <input ref={fileRef} type="file" accept=".xlsx,.csv,.txt" className="sr-only" aria-label="Upload contacts file" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void prepare(f);}}/>
     <button type="button" disabled={busy} className={action+' flex items-center gap-2'} onClick={()=>fileRef.current?.click()}><Upload size={16}/> Choose file</button>
     <textarea aria-label="Paste email addresses" className={input} rows={3} maxLength={EMAIL_IMPORT_MAX_BYTES} placeholder="Paste email addresses, one per line or comma separated" value={text} disabled={busy} onChange={e=>{setText(e.target.value);setPreview(null);setAttested(false);}}/>
     <button type="button" disabled={busy||!text.trim()} onClick={prepareText} className={action}>Preview pasted contacts</button>
   </div>
   {preview&&<div className="space-y-3 rounded-lg border p-3">
     <div className="grid grid-cols-3 gap-2 text-center text-xs">{[{label:'Valid',count:preview.emails.length},{label:'Duplicates',count:preview.duplicates},{label:'Invalid',count:preview.invalid}].map(x=><div key={x.label} className="rounded bg-neutral-50 p-2"><p className="text-lg font-semibold">{x.count}</p>{x.label}</div>)}</div>
     <div className="max-h-36 overflow-auto text-xs">{preview.emails.slice(0,30).map(e=><p key={e} className="break-all py-1">{e}</p>)}{preview.emails.length>30&&<p>Showing first 30 of {preview.emails.length}.</p>}</div>
     <label className="block text-xs font-medium">List name<input className={input} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5 accent-[#EA580C]" checked={attested} onChange={e=>setAttested(e.target.checked)}/>I have permission to email these contacts for this business, and will honor unsubscribe requests. No purchased or scraped lists.</label>
     <button type="button" disabled={busy||!name.trim()||!preview.emails.length||!attested} onClick={()=>void save()} className="rounded-lg bg-[#EA580C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Save contact list</button>
   </div>}
   <div className="space-y-2"><h4 className="text-sm font-semibold">Saved lists</h4>{lists.length===0&&<p className="text-xs text-neutral-500">No imported lists yet.</p>}
     {lists.map(l=><div key={l.id} className="flex items-center gap-2 rounded-lg border p-2"><button type="button" disabled={busy} onClick={()=>{setSelected(l.id);setOffset(0);setContacts([]);}} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium">{l.name}</p><p className="text-xs text-neutral-500">{l.eligible} eligible · {l.total} contacts</p></button><button type="button" disabled={busy} onClick={()=>void remove(l.id)} aria-label={'Delete '+l.name} className="p-2 text-neutral-500"><Trash2 size={16}/></button></div>)}
   </div>
   {selected&&<div className="space-y-2"><h4 className="text-sm font-semibold">{lists.find(l=>l.id===selected)?.name||'Contacts'}</h4><div className="max-h-56 overflow-auto divide-y rounded-lg border">{contacts.map(c=><div key={c.email} className="flex items-center gap-2 px-2 py-1.5 text-xs"><span className="min-w-0 flex-1 break-all">{c.email}{c.suppressed&&<span className="ml-1 text-neutral-500">· Suppressed</span>}</span><button type="button" disabled={busy} aria-label={'Remove '+c.email} onClick={()=>void remove(selected,c.email)}><Trash2 size={14}/></button></div>)}</div><div className="flex justify-between"><button type="button" className={action} disabled={offset===0||busy} onClick={()=>setOffset(x=>Math.max(0,x-100))}>Previous</button><button type="button" className={action} disabled={contacts.length<100||busy} onClick={()=>setOffset(x=>x+100)}>Next</button></div></div>}
   {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}{success&&<p role="status" className="text-xs text-emerald-700">{success}</p>}
 </section>;
}
