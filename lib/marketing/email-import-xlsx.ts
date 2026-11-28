import {EMAIL_IMPORT_MAX_BYTES,previewImport,type ImportPreview} from './email-import-contract';
const MAX_XML=8*1024*1024;
const MAX_TOTAL=16*1024*1024;
const decoder=new TextDecoder();
type Entry={name:string;method:number;size:number;compressed:number;offset:number};
function entries(buffer:ArrayBuffer):Entry[]{
 const v=new DataView(buffer),bytes=new Uint8Array(buffer),n=buffer.byteLength;
 if(n<22||n>EMAIL_IMPORT_MAX_BYTES)throw Error('Invalid or oversized Excel file.');
 let end=-1;
 for(let i=n-22;i>=Math.max(0,n-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===n){end=i;break;}
 if(end<0||v.getUint16(end+4,true)||v.getUint16(end+6,true))throw Error('Unsupported Excel archive.');
 const count=v.getUint16(end+10,true),directorySize=v.getUint32(end+12,true),start=v.getUint32(end+16,true);
 if(count>1000||start+directorySize>end)throw Error('Invalid Excel directory.');
 const out:Entry[]=[];let p=start,total=0;
 for(let i=0;i<count;i++){
   if(p+46>start+directorySize||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid Excel directory.');
   const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),compressed=v.getUint32(p+20,true),size=v.getUint32(p+24,true),nameLen=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);
   const next=p+46+nameLen+extra+comment;if(next>start+v.getUint32(end+12,true))throw Error('Invalid Excel entry.');
   const name=decoder.decode(bytes.subarray(p+46,p+46+nameLen));p=next;
   if(!/^xl\/(?:sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(name))continue;
   if((flags&1)||![0,8].includes(method)||size>MAX_XML||(total+=size)>MAX_TOTAL||out.some(e=>e.name===name))throw Error('Unsupported or oversized Excel worksheet.');
   if(offset+30>start||v.getUint32(offset,true)!==0x04034b50)throw Error('Invalid Excel worksheet.');
   const dataOffset=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);
   if(dataOffset+compressed>start)throw Error('Invalid Excel worksheet.');
   out.push({name,method,size,compressed,offset:dataOffset});
 }
 if(!out.some(e=>e.name.includes('/worksheets/')))throw Error('No supported worksheets found.');
 return out;
}
async function xml(buffer:ArrayBuffer,e:Entry):Promise<Document>{
 const raw=buffer.slice(e.offset,e.offset+e.compressed);
 let bytes:Uint8Array;
 if(e.method===0){bytes=new Uint8Array(raw);}
 else{
   if(typeof DecompressionStream==='undefined')throw Error('This browser cannot read Excel. Save as CSV and retry.');
   const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
   const chunks:Uint8Array[]=[];let length=0;
   try{for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>e.size||length>MAX_XML){await reader.cancel();throw Error('Excel worksheet exceeds size limit.')}chunks.push(r.value);}}
   finally{reader.releaseLock();}
   bytes=new Uint8Array(length);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
 }
 if(bytes.length!==e.size)throw Error('Invalid Excel worksheet length.');
 const text=decoder.decode(bytes);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Unsupported Excel XML.');
 const doc=new DOMParser().parseFromString(text,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('Invalid Excel worksheet XML.');
 return doc;
}
const nodes=(root:Document|Element,name:string)=>Array.from(root.getElementsByTagNameNS('*',name));
const joinedText=(root:Element)=>nodes(root,'t').map(t=>t.textContent||'').join('');
export async function parseContactXlsx(buffer:ArrayBuffer):Promise<ImportPreview>{
 const files=entries(buffer),shared=files.find(e=>e.name==='xl/sharedStrings.xml');
 const strings=shared?nodes(await xml(buffer,shared),'si').map(joinedText):[];
 if(strings.length>100000)throw Error('Too many Excel strings.');
 const cells:string[]=[];
 for(const sheet of files.filter(e=>e.name.includes('/worksheets/'))){
   const doc=await xml(buffer,sheet);
   for(const c of nodes(doc,'c')){
     if(cells.length>=100000)throw Error('Too many Excel cells.');
     if(nodes(c,'f').length)continue;
     const type=c.getAttribute('t'),value=nodes(c,'v')[0]?.textContent||'';
     if(type==='s'&&/^\d+$/.test(value))cells.push(strings[Number(value)]||'');
     else if(type==='inlineStr')cells.push(joinedText(c));
     else if(type==='str')cells.push(value);
   }
 }
 return previewImport(cells);
}
